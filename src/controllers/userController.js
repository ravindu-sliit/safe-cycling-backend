// src/controllers/userController.js
const userService = require('../services/userService');
const { sendWelcomeEmail } = require('../services/emailService');
const crypto = require('crypto');

// Create a new user profile
const createUser = async (req, res) => {
    try {
        // 1. Generate a random, plain-text token
        const verificationToken = crypto.randomBytes(20).toString('hex');

        // 2. Hash the token to save securely in the database
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // 3. Attach the hashed token to the incoming data BEFORE saving
        req.body.verificationToken = hashedToken;

        // 4. Create the user in the database (this will now save the token!)
        const newUser = await userService.createUser(req.body);
        
        // 5. Create the clickable Verification URL 
        const verificationUrl = `http://localhost:5000/api/auth/verify/${verificationToken}`;

        // --- UPDATED API TRIGGER ---
        // Send the welcome email and pass the verificationUrl to your email service
        await sendWelcomeEmail(newUser.email, newUser.name, verificationUrl);
        // -----------------------

        // FIX 1: Convert to object and remove password before sending to frontend
        const userResponse = newUser.toObject();
        delete userResponse.password;

        // Update the response to tell the frontend to check their email
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful! Please check your email to verify your account.',
            data: userResponse 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Retrieve a specific user's profile details
const getUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// GET /api/users
const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update user information
const updateUser = async (req, res) => {
    try {
        // Resource-based ownership check: allow if updating own profile OR admin
        if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: You can only update your own profile' 
            });
        }

        const updatedUser = await userService.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Remove a user profile from the system
const deleteUser = async (req, res) => {
    try {
        // FIX 4: Security Check - Ensure the logged-in user matches the ID being deleted
        if (req.user && req.user.id !== req.params.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: You can only delete your own profile' 
            });
        }

        const deletedUser = await userService.deleteUser(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, message: 'User profile removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUsers
};