import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';

export const createProject = async ({
    name, userId
}) => {
    if (!name) {
        throw new Error('Name is required')
    }
    if (!userId) {
        throw new Error('UserId is required')
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [ userId ]
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;

}


export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required')
    }

    const allUserProjects = await projectModel.find({
        users: userId
    })

    return allUserProjects
}

export const addUsersToProject = async ({ projectId, users, userId }) => {

    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!users) {
        throw new Error("users are required")
    }

    if (!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error("Invalid userId(s) in users array")
    }

    if (!userId) {
        throw new Error("userId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId")
    }


    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    console.log(project)

    if (!project) {
        throw new Error("User not belong to this project")
    }

    const updatedProject = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        $addToSet: {
            users: {
                $each: users
            }
        }
    }, {
        new: true
    })

    return updatedProject



}

export const getProjectById = async ({ projectId }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    const project = await projectModel.findOne({
        _id: projectId
    }).populate('users')

    if (!project) {
        throw new Error("Project not found")
    }

    // Enrich messages with latest user details (to show usernames for old messages)
    if (project.messages && project.messages.length > 0) {
        const userMap = new Map(project.users.map(u => [u._id.toString(), u]));
        
        project.messages = project.messages.map(msg => {
            if (msg.sender && msg.sender._id && msg.sender._id !== 'ai') {
                const latestUser = userMap.get(msg.sender._id.toString());
                if (latestUser) {
                    return {
                        ...msg,
                        sender: {
                            _id: latestUser._id,
                            email: latestUser.email,
                            username: latestUser.username // Ensure username is included
                        }
                    };
                }
            }
            return msg;
        });
    }

    return project;
}

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}

export const updateMessages = async ({ projectId, messages }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!messages) {
        throw new Error("messages are required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        messages
    }, {
        new: true
    })

    return project;
}

export const deleteProjectById = async ({ projectId, userId }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    // Check if project exists and user is a member
    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    });

    if (!project) {
        throw new Error("Project not found or you don't have permission to delete it")
    }

    await projectModel.findOneAndDelete({ _id: projectId });
    
    return true;
}