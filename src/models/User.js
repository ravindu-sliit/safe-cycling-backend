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
    preferences: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            marketing: {
                type: Boolean,
                default: false
            }
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'private'],
                default: 'public'
            },
            showEmail: {
                type: Boolean,
                default: false
            }
        },
        appearance: {
            language: {
                type: String,
                default: 'en'
            },
            theme: {
                type: String,
                enum: ['light', 'dark', 'system'],
                default: 'system'
            }
        }
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
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorCode: {
        type: String,
        select: false
    },
    twoFactorCodeExpire: {
        type: Date,
        select: false
    },
    twoFactorChallengeToken: {
        type: String,
        select: false
    },
    twoFactorChallengeExpire: {
        type: Date,
        select: false
    },
    twoFactorAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    twoFactorLastSentAt: {
        type: Date,
        select: false
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
