// src/services/userService.js
const User = require('../models/User');

// Create a new user in the database
const createUser = async (userData) => {
    return await User.create(userData);
};

// Find a user by their ID
const getUserById = async (id) => {
    return await User.findById(id);
};

// Update a user's details
const updateUser = async (id, updateData) => {
    return await User.findByIdAndUpdate(id, updateData, { 
        new: true, 
        runValidators: true 
    });
};

// Delete a user from the database
const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};

// Get all users (excluding passwords for security)
const getAllUsers = async () => {
    return await User.find().select('-password'); 
};

module.exports = {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers
};