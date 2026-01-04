import userModel from '../models/user.model.js';
import invitationModel from '../models/invitation.model.js';
import projectModel from '../models/project.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';

export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await userService.createUser(req.body);
        const token = await user.generateJWT();
        delete user._doc.password;
        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                errors: [ { msg: 'Invalid Email or Password' } ]
            });
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                errors: [ { msg: 'Invalid Email or Password' } ]
            });
        }

        const token = await user.generateJWT();
        delete user._doc.password;
        res.status(200).json({ user, token });
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}

export const profileController = async (req, res) => {
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];
        await redisClient.set(token, 'logout', 'EX', 60 * 60 * 24);
        res.status(200).json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}

export const getAllUsersController = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });
        const allUsers = await userService.getAllUsers({ userId: loggedInUser._id });
        return res.status(200).json({
            users: allUsers
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}

// Search for users by username or email
export const searchUserController = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        // Get the logged-in user to exclude from results
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        
        const users = await userModel.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                },
                // Exclude the currently logged-in user
                { _id: { $ne: loggedInUser._id } }
            ]
        }).select('-password').limit(10);
        
        res.status(200).json({ users });
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}

// Update username
export const updateUsernameController = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }
        
        const user = await userModel.findOneAndUpdate(
            { email: req.user.email },
            { username },
            { new: true }
        ).select('-password');
        
        res.status(200).json({ user, message: 'Username updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}

// Send invitation to join a project
export const sendInvitationController = async (req, res) => {
    try {
        const { recipientId, projectId } = req.body;
        
        if (!recipientId || !projectId) {
            return res.status(400).json({ error: 'recipientId and projectId are required' });
        }
        
        // Find the sender user
        const senderUser = await userModel.findOne({ email: req.user.email });
        
        // Check if trying to invite self
        if (senderUser._id.toString() === recipientId.toString()) {
            return res.status(400).json({ error: 'You cannot send an invitation to yourself' });
        }
        
        // Check if recipient exists
        const recipientUser = await userModel.findById(recipientId);
        if (!recipientUser) {
            return res.status(404).json({ error: 'Recipient not found' });
        }
        
        // Check if invitation already exists
        const existingInvitation = await invitationModel.findOne({
            sender: senderUser._id,
            recipient: recipientId,
            project: projectId,
            status: 'pending'
        });
        
        if (existingInvitation) {
            return res.status(400).json({ error: 'Invitation already sent' });
        }
        
        // Create new invitation
        const invitation = await invitationModel.create({
            sender: senderUser._id,
            recipient: recipientId,
            project: projectId
        });
        
        // Populate the invitation before sending back
        const populatedInvitation = await invitationModel.findById(invitation._id)
            .populate('sender', 'username email')
            .populate('recipient', 'username email')
            .populate('project', 'name');
        
        res.status(200).json({ 
            message: 'Invitation sent successfully',
            invitation: populatedInvitation
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}

// Get all pending invitations for the logged-in user
export const getInvitationsController = async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        
        const invitations = await invitationModel.find({
            recipient: user._id,
            status: 'pending'
        })
        .populate('sender', 'username email')
        .populate('project', 'name')
        .sort({ createdAt: -1 });
        
        res.status(200).json({ invitations });
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}

// Accept or reject an invitation
export const acceptInvitationController = async (req, res) => {
    try {
        const { invitationId, action } = req.body;
        
        if (!invitationId || !action) {
            return res.status(400).json({ error: 'invitationId and action are required' });
        }
        
        if (!['accept', 'reject', 'accepted', 'rejected'].includes(action)) {
            return res.status(400).json({ error: 'Action must be accept/accepted or reject/rejected' });
        }
        
        const invitation = await invitationModel.findById(invitationId);
        
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        
        const user = await userModel.findOne({ email: req.user.email });
        
        // Verify the invitation is for the logged-in user
        if (invitation.recipient.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: 'Invitation already processed' });
        }
        
        // Normalize action (accept/accepted -> accepted, reject/rejected -> rejected)
        const normalizedAction = action === 'accept' || action === 'accepted' ? 'accepted' : 'rejected';
        
        // Update invitation status
        invitation.status = normalizedAction;
        await invitation.save();
        
        // If accepted, add user to project
        if (normalizedAction === 'accepted') {
            await projectModel.findByIdAndUpdate(
                invitation.project,
                { $addToSet: { users: user._id } }
            );
        }
        
        res.status(200).json({ 
            message: `Invitation ${normalizedAction} successfully`,
            invitation
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}
export const uploadProfileImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        // Save file path to user model logic here if needed
        res.status(200).json({ message: 'File uploaded', filePath: req.file.path });
    } catch(err) {
        res.status(500).send(err.message);
    }
}
