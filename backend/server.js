import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];

        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }


        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})

io.on('connection', socket => {
    // Use project ID from query params for proper room isolation
    const projectId = socket.handshake.query.projectId;
    socket.roomId = projectId || socket.user?.userId || socket.user?._id || 'default-room';

    console.log('a user connected to room:', socket.roomId);

    socket.join(socket.roomId);

    // Handle typing indicators
    socket.on('typing-start', (data) => {
        socket.broadcast.to(socket.roomId).emit('typing-start', data);
    });

    socket.on('typing-stop', (data) => {
        socket.broadcast.to(socket.roomId).emit('typing-stop', data);
    });

    socket.on('project-message', async data => {

        const message = data.message;

        const aiIsPresentInMessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message', data)

        // Save message to database immediately to prevent race conditions
        const projectId = socket.handshake.query.projectId;
        console.log('Saving message to project:', projectId);
        if (projectId) {
            try {
                await projectModel.findByIdAndUpdate(
                    projectId,
                    { $push: { messages: data } },
                    { new: true }
                );
                console.log('✅ Message saved successfully');
            } catch (err) {
                console.error('❌ Error saving message:', err);
            }
        } else {
            console.warn('⚠️ No projectId - message not saved');
        }

        if (aiIsPresentInMessage) {


            const prompt = message.replace('@ai', '');
            
            // Use the user's selected model type (defaults to 'groq' if not specified)
            const modelType = data.modelType || 'groq';
            console.log(`🤖 Using AI model: ${modelType}`);
            
            const result = await generateResult(prompt, modelType);

            const aiMessage = {
                message: result,
                sender: {
                    _id: 'ai',
                    email: 'AI'
                },
                sessionId: data.sessionId,
                modelType: data.modelType
            };

            io.to(socket.roomId).emit('project-message', aiMessage);

            // Save AI message to database too
            if (projectId) {
                try {
                    await projectModel.findByIdAndUpdate(
                        projectId,
                        { $push: { messages: aiMessage } },
                        { new: true }
                    );
                } catch (err) {
                    console.error('Error saving AI message:', err);
                }
            }

            return
        }


    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
