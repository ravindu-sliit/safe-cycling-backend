
const User = require('../models/User');


const createUser = async (userData) => {
    return await User.create(userData);
};

const normalizeUserResponse = (user) => {
    if (!user) {
        return user;
    }

    const userResponse = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete userResponse.password;
    userResponse.profileImageUrl = userResponse.profileImageUrl || '';

    return userResponse;
};


const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};


const normalizeRole = (value) => String(value || 'user').trim().toLowerCase();
const normalizeBoolean = (value) => value === true || value === 'true';

const updateUser = async (id, updateData, options = {}) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    const allowedFields = ['name', 'email', 'cyclingStyle', 'password'];
    const isAdmin = options.isAdmin === true;

    if (isAdmin) {
        allowedFields.push('role', 'isVerified');
    }

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updateData, field) && updateData[field] !== undefined) {
            if (field === 'role') {
                user.role = normalizeRole(updateData.role);
                return;
            }

            if (field === 'isVerified') {
                user.isVerified = normalizeBoolean(updateData.isVerified);

                if (user.isVerified) {
                    user.verificationToken = undefined;
                }
                return;
            }

            user[field] = updateData[field];
        }
    });

    // Calling .save() forces the bcrypt pre('save') hook to run!
    await user.save();

    return normalizeUserResponse(user);
};

const setUserProfileImage = async (id, profileImageUrl) => {
    const user = await User.findById(id);
    if (!user) {
        throw new Error('User not found');
    }

    user.profileImageUrl = profileImageUrl || '';
    await user.save();

    return normalizeUserResponse(user);
};

const clearUserProfileImage = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        throw new Error('User not found');
    }

    user.profileImageUrl = '';
    await user.save();

    return normalizeUserResponse(user);
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
    setUserProfileImage,
    clearUserProfileImage,
    deleteUser,
    getAllUsers
};
