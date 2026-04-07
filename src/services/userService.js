
const User = require('../models/User');


const createUser = async (userData) => {
    return await User.create(userData);
};


const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};


const updateUser = async (id, updateData) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    // This merges the new data into the existing user object
    Object.assign(user, updateData);

    // Calling .save() forces the bcrypt pre('save') hook to run!
    await user.save();

    // Strip the password before returning
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return userResponse;
};


const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};


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