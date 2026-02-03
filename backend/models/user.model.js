import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minLength: [ 6, 'Email must be at least 6 characters long' ],
        maxLength: [ 50, 'Email must not be longer than 50 characters' ]
    },

    password: {
        type: String,
        select: false,
    },
    profileImage: {
        type: String,
        default: null
    },
    editorTheme: {
        type: String,
        default: 'vs-dark' // vs-dark, vs-light, monokai
    },
    appTheme: {
        type: String,
        default: 'dark' // dark, light
    },
    fullname: {
        type: String,
        trim: true,
    },
    username: {
        type: String,
        default: function() {
            // Generate default username from email if not provided
            return this.email ? this.email.split('@')[0] : 'user';
        }
    }
})

userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

userSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateJWT = function () {
    return jwt.sign(
        { email: this.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

const User = mongoose.model('user', userSchema);

export default User;
