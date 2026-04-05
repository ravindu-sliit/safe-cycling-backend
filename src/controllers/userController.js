// src/controllers/userController.js
const userService = require('../services/userService');
const { sendWelcomeEmail } = require('../services/emailService');

//Create a new user profile

const createUser = async (req, res) => {
    try {
        const newUser = await userService.createUser(req.body);
        
        // --- NEW API TRIGGER ---
        // Send the welcome email asynchronously 
        await sendWelcomeEmail(newUser.email, newUser.name);
        // -----------------------

        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

//Retrieve a specific user's profile details
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

//GET /api/users
const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

//    Update user information
const updateUser = async (req, res) => {
    try {
        const updatedUser = await userService.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

//   Remove a user profile from the system

const deleteUser = async (req, res) => {
    try {
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