// src/services/authService.js
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const loginUser = async (email, password) => {
    // 1. Check if the user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid email or password');
    }

    // 2. Compare the typed password with the scrambled database password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    if (!user.isVerified) {
        throw new Error('Please verify your email address before logging in.');
    }

    // 3. Generate the JWT (JSON Web Token) VIP Pass
    const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' } // Token lasts for 30 days
    );

    return { user, token };
};

// NEW: Function to verify the email token
const verifyEmailToken = async (token) => {
    // 1. Hash the incoming token so it matches what we saved in the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find the user with that exact token
    const user = await User.findOne({ verificationToken: hashedToken });

    if (!user) {
        throw new Error('Invalid or expired verification token');
    }

    // 3. Flip the switch to verified and delete the token!
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return user;
};

// 1. Generate the token and save it to the DB with a 10-minute timer
const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('There is no user registered with that email address.');
    }

    // Generate a random plain-text token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash it and save it to the database
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes from exactly right now

    await user.save(); // Save the token and timer to the user document

    return { user, resetToken };
};

// 2. Verify the token, check the timer, and save the new password
const resetPassword = async (resetToken, newPassword) => {
    // Re-hash the token from the URL so we can find it in the DB
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find the user with this token WHERE the expiration time is greater than ($gt) right now
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() } // The magic expiration check!
    });

    if (!user) {
        throw new Error('Invalid or expired password reset token');
    }

    // Set the new password. Your bcrypt pre('save') hook will automatically scramble it!
    user.password = newPassword;
    
    // Clear out the token fields so they can't use the link twice
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    return user;
};

module.exports = {
    loginUser,
    verifyEmailToken,
    forgotPassword,
    resetPassword
};
