const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please add a name'] 
    },
    email: { 
        type: String, 
        required: [true, 'Please add an email'], 
        unique: true 
    },
    password: { 
        type: String, 
        required: [true, 'Please add a password'] 
    },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'organization'],
        default: 'user' 
    },
    cyclingStyle: { 
        type: String,
        default: 'commuter'
    }
}, { 
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('User', userSchema);