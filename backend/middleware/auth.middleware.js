import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";
import userModel from "../models/user.model.js";


export const authUser = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];

        if (!token) {
            return res.status(401).send({ error: 'Unauthorized User' });
        }

        // Check blacklist only if Redis is available
        try {
            const isBlackListed = await redisClient.get(token);
            if (isBlackListed) {
                res.cookie('token', '');
                return res.status(401).send({ error: 'Unauthorized User' });
            }
        } catch (redisError) {
            // Redis not available, skip blacklist check
            // This allows the app to work without Redis
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await userModel.findOne({ email: decoded.email });
        
        if (!user) {
            return res.status(401).send({ error: 'Unauthorized User' });
        }

        req.user = user;
        
        next();

    } catch (error) {

        console.log(error);

        res.status(401).send({ error: 'Unauthorized User' });
    }
}
