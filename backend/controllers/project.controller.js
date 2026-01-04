import projectModel from '../models/project.model.js';
import * as projectService from '../services/project.service.js';
import * as executionService from '../services/execution.service.js';
import userModel from '../models/user.model.js';
import { validationResult } from 'express-validator';

export const createProject = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { name } = req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const userId = loggedInUser._id;
        const newProject = await projectService.createProject({ name, userId });
        res.status(201).json(newProject);
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}

export const getAllProject = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const AllUserProjects = await projectService.getAllProjectByUserId({ userId: loggedInUser._id });
        return res.status(200).json({ projects: AllUserProjects });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { projectId, users } = req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const project = await projectService.addUsersToProject({ projectId, users, userId: loggedInUser._id });
        return res.status(200).json({ project });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

export const getProjectById = async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await projectService.getProjectById({ projectId });
        return res.status(200).json({ project });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { projectId, fileTree } = req.body;
        const project = await projectService.updateFileTree({ projectId, fileTree });
        return res.status(200).json({ project });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

export const executeProjectCode = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { code, language, filename } = req.body;
        
        if (!code || !language) {
            return res.status(400).json({ error: 'Code and language are required' });
        }
        
        // Execute the code using execution service
        const result = await executionService.executeCode(
            language, 
            code, 
            filename || `script_${Date.now()}`
        );
        
        if (result.error) {
            return res.status(200).json({ 
                success: false,
                error: result.error,
                output: result.output || '',
                stderr: result.stderr || ''
            });
        }
        
        return res.status(200).json({ 
            success: true,
            output: result.output 
        });
        
    } catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({ error: error.message });
    }
}

export const updateMessages = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { projectId, messages } = req.body;
        const project = await projectService.updateMessages({ projectId, messages });
        return res.status(200).json({ project });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

export const deleteProject = async (req, res) => {
    const { projectId } = req.params;
    try {
         const loggedInUser = await userModel.findOne({ email: req.user.email });
         await projectService.deleteProjectById({ projectId, userId: loggedInUser._id });
         res.status(200).json({ message: "Project deleted" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
