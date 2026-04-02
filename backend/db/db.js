import mongoose from 'mongoose';

function connect() {
    const options = {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000
    };

    mongoose.connect(process.env.MONGODB_URI, options)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch(err => {
            console.log("MongoDB Initial Connection Error:", err.message);
        });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected! Attempting to reconnect...');
    });
    
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB persistent error:', err.message);
    });
}

export default connect;
