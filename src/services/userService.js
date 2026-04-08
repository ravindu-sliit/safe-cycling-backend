const User = require('../models/User');
const { applyUserPreferencesUpdate, buildUserPreferences } = require('../utils/userPreferences');

const createUser = async (userData) => {
    return await User.create(userData);
};

const normalizeUserResponse = (user) => {
    if (!user) {
        return user;
    }

    const userResponse = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpire;
    delete userResponse.twoFactorCode;
    delete userResponse.twoFactorCodeExpire;
    delete userResponse.twoFactorChallengeToken;
    delete userResponse.twoFactorChallengeExpire;
    delete userResponse.twoFactorAttempts;
    delete userResponse.twoFactorLastSentAt;
    userResponse.profileImageUrl = userResponse.profileImageUrl || '';
    userResponse.cyclingStyle = roleSupportsCyclingStyle(userResponse.role)
        ? (userResponse.cyclingStyle || 'commuter')
        : '';
    userResponse.twoFactorEnabled = Boolean(userResponse.twoFactorEnabled);
    userResponse.preferences = buildUserPreferences(userResponse.preferences);

    return userResponse;
};

const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};

const normalizeRole = (value) => {
    const role = String(value || 'user').trim().toLowerCase();
    return role === 'organisation' ? 'organization' : role;
};
const normalizeBoolean = (value) => value === true || value === 'true';
const roleSupportsCyclingStyle = (role) => normalizeRole(role) === 'user';

const updateUser = async (id, updateData, options = {}) => {
    const user = await User.findById(id);
    if (!user) {
        throw new Error('User not found');
    }

    const isAdmin = options.isAdmin === true;
    const requestedRole = isAdmin && Object.prototype.hasOwnProperty.call(updateData, 'role')
        ? normalizeRole(updateData.role)
        : normalizeRole(user.role);

    if (Object.prototype.hasOwnProperty.call(updateData, 'name') && updateData.name !== undefined) {
        user.name = updateData.name;
    }

    if (isAdmin && Object.prototype.hasOwnProperty.call(updateData, 'role') && updateData.role !== undefined) {
        user.role = requestedRole;
    }

    if (isAdmin && Object.prototype.hasOwnProperty.call(updateData, 'isVerified') && updateData.isVerified !== undefined) {
        user.isVerified = normalizeBoolean(updateData.isVerified);

        if (user.isVerified) {
            user.verificationToken = undefined;
        }
    }

    if (roleSupportsCyclingStyle(requestedRole)) {
        if (Object.prototype.hasOwnProperty.call(updateData, 'cyclingStyle') && updateData.cyclingStyle !== undefined) {
            user.cyclingStyle = updateData.cyclingStyle;
        }
    } else {
        user.cyclingStyle = '';
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'preferences')) {
        applyUserPreferencesUpdate(user, updateData.preferences);
    }

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
    const users = await User.find().select('-password');
    return users.map((user) => normalizeUserResponse(user));
};

module.exports = {
    createUser,
    getUserById,
    updateUser,
    setUserProfileImage,
    clearUserProfileImage,
    deleteUser,
    getAllUsers,
    normalizeUserResponse,
};
