const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    },
    profileImageUrl: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpire: {
        type: Date
    }
}, { 
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

userSchema.pre('save', async function () {
    // If the password wasn't modified, skip this
    if (!this.isModified('password')) {
        return;
    }
    // Generate a 'salt' and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
});

module.exports = mongoose.model('User', userSchema);
