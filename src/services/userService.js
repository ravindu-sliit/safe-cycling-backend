
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

    const allowedFields = ['name', 'email', 'cyclingStyle', 'password'];

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updateData, field) && updateData[field] !== undefined) {
            user[field] = updateData[field];
        }
    });

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
