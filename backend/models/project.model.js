import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        trim: true,
        unique: [ true, 'Project name must be unique' ],
    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    fileTree: {
        type: Object,
        default: {}
    },
    description: {
        type: String,
        default: "A collaborative project."
    },
    techStack: {
        type: [String],
        default: []
    },
    messages: {
        type: Array,
        default: []
    }
}, { timestamps: true })

const Project = mongoose.model('project', projectSchema);

export default Project;
