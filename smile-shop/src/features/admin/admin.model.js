// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'editor'],
        default: 'editor'
    }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
