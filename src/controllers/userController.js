// src/controllers/userController.js
const userService = require('../services/userService');
const authService = require('../services/authService');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { buildVerificationUrl } = require('../config/appUrls');
const PRIVILEGED_ROLES = ['admin', 'organization'];
const UPLOAD_DIRECTORY = path.join(__dirname, '..', 'uploads');

const MIME_EXTENSION_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

const normalizeRole = (value) => String(value || 'user').trim().toLowerCase();
const normalizeBoolean = (value) => value === true || value === 'true';

const canManageUser = (req) => req.user._id.toString() === req.params.id || req.user.role === 'admin';
const normalizeUserPayload = (user) => userService.normalizeUserResponse(user);

const getFileExtension = (file) => {
    const mimetypeExtension = MIME_EXTENSION_MAP[file.mimetype];
    if (mimetypeExtension) {
        return mimetypeExtension;
    }

    const originalExtension = path.extname(file.originalname || '').replace('.', '').trim().toLowerCase();
    return originalExtension || 'bin';
};

const buildPublicUploadUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

const resolveManagedUploadPath = (fileUrl) => {
    if (!fileUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(fileUrl, 'http://localhost');
        const pathname = decodeURIComponent(parsedUrl.pathname || '');
        if (!pathname.startsWith('/uploads/')) {
            return null;
        }

        const filename = path.basename(pathname);
        if (!filename || filename === 'uploads') {
            return null;
        }

        const absoluteFilePath = path.resolve(path.join(UPLOAD_DIRECTORY, filename));
        const normalizedUploadDirectory = `${path.resolve(UPLOAD_DIRECTORY)}${path.sep}`;

        return absoluteFilePath.startsWith(normalizedUploadDirectory) ? absoluteFilePath : null;
    } catch (error) {
        return null;
    }
};

const deleteManagedUpload = async (fileUrl) => {
    const absoluteFilePath = resolveManagedUploadPath(fileUrl);
    if (!absoluteFilePath) {
        return;
    }

    try {
        await fs.unlink(absoluteFilePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
};

// Create a new user profile
const createUser = async (req, res) => {
    try {
        const requestedRole = normalizeRole(req.body.role);
        const isPrivilegedRole = PRIVILEGED_ROLES.includes(requestedRole);
        const isAdminRequest = req.user?.role === 'admin';

        // Public registration can only create regular users.
        // Admin-authenticated requests may create privileged accounts.
        if (isPrivilegedRole && !isAdminRequest) {
            return res.status(403).json({ 
                success: false, 
                message: 'You cannot assign this role. Contact an admin.' 
            });
        }

        req.body.role = isAdminRequest ? requestedRole : 'user';
        req.body.isVerified = isAdminRequest ? normalizeBoolean(req.body.isVerified) : false;

        let verificationUrl = '';

        if (!req.body.isVerified) {
            const { plainToken: verificationToken, hashedToken } = authService.generateVerificationTokenPair();

            req.body.verificationToken = hashedToken;
            verificationUrl = buildVerificationUrl(req, verificationToken);
        } else {
            req.body.verificationToken = undefined;
        }

        // 4. Create the user in the database (this will now save the token!)
        const newUser = await userService.createUser(req.body);

        if (verificationUrl) {
            await sendWelcomeEmail(newUser.email, newUser.name, verificationUrl);
        }

        const userResponse = normalizeUserPayload(newUser);
        delete userResponse.password;

        res.status(201).json({ 
            success: true, 
            message: verificationUrl
                ? 'Registration successful! Please check your email to verify your account.'
                : 'User created successfully.',
            data: userResponse 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, data: normalizeUserPayload(user) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const updateCurrentUser = async (req, res) => {
    try {
        const updatedUser = await userService.updateUser(req.user._id, req.body, { isAdmin: false });
        return res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const updateCurrentUserTwoFactor = async (req, res) => {
    try {
        const user = await authService.updateTwoFactorPreference(
            req.user._id,
            req.body.enabled,
            req.body.currentPassword
        );

        return res.status(200).json({
            success: true,
            message: user.twoFactorEnabled
                ? '2-step verification enabled successfully.'
                : '2-step verification disabled successfully.',
            data: normalizeUserPayload(user),
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
};

const changeCurrentUserEmail = async (req, res) => {
    try {
        const { user, verificationToken } = await authService.changeUserEmail(
            req.user._id,
            req.body.email,
            req.body.currentPassword
        );

        const verificationUrl = buildVerificationUrl(req, verificationToken);
        await sendVerificationEmail(user.email, user.name, verificationUrl, {
            subject: 'Verify your new Safe Cycling email address',
            preheader: 'Confirm your updated Safe Cycling email address.',
            heading: `Hi ${user.name || 'there'}, verify your new email address`,
            intro: 'We updated the email address on your Safe Cycling account. Please verify this new email to keep your account fully active.',
            buttonLabel: 'Verify new email address',
        });

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully. Please verify your new email address.',
            data: normalizeUserPayload(user),
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// Retrieve a specific user's profile details
const getUser = async (req, res) => {
    try {
        if (!canManageUser(req)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only view your own profile unless you are an admin.',
            });
        }

        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: normalizeUserPayload(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// GET /api/users
const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json({
            success: true,
            count: users.length,
            data: users.map((user) => normalizeUserPayload(user)),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update user information
const updateUser = async (req, res) => {
    try {
        // Resource-based ownership check: allow if updating own profile OR admin
        if (!canManageUser(req)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: You can only update your own profile' 
            });
        }

        const updatedUser = await userService.updateUser(
            req.params.id,
            req.body,
            {
                isAdmin: req.user.role === 'admin',
            }
        );
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const uploadProfileImage = async (req, res, next) => {
    let uploadedFilePath = '';

    try {
        if (!canManageUser(req)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only update your own profile image'
            });
        }

        if (!req.file?.buffer?.length) {
            return res.status(400).json({ success: false, message: 'Please choose an image to upload.' });
        }

        const existingUser = await userService.getUserById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });

        const extension = getFileExtension(req.file);
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
        uploadedFilePath = path.join(UPLOAD_DIRECTORY, filename);

        await fs.writeFile(uploadedFilePath, req.file.buffer);

        const updatedUser = await userService.setUserProfileImage(
            req.params.id,
            buildPublicUploadUrl(req, filename)
        );

        if (existingUser.profileImageUrl && existingUser.profileImageUrl !== updatedUser.profileImageUrl) {
            deleteManagedUpload(existingUser.profileImageUrl).catch((error) => {
                console.error('Failed to remove previous profile image:', error);
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile image updated successfully.',
            data: updatedUser,
        });
    } catch (error) {
        if (uploadedFilePath) {
            fs.unlink(uploadedFilePath).catch(() => {});
        }

        next(error);
    }
};

const removeProfileImage = async (req, res, next) => {
    try {
        if (!canManageUser(req)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only update your own profile image'
            });
        }

        const existingUser = await userService.getUserById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updatedUser = await userService.clearUserProfileImage(req.params.id);

        if (existingUser.profileImageUrl) {
            deleteManagedUpload(existingUser.profileImageUrl).catch((error) => {
                console.error('Failed to remove profile image:', error);
            });
        }

        res.status(200).json({
            success: true,
            message: existingUser.profileImageUrl
                ? 'Profile image removed successfully.'
                : 'Profile image is already empty.',
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};

// Remove a user profile from the system
const deleteUser = async (req, res) => {
    try {
        // Resource-based ownership check: allow if deleting own profile OR admin
        if (!canManageUser(req)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: You can only delete your own profile' 
            });
        }

        const deletedUser = await userService.deleteUser(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (deletedUser.profileImageUrl) {
            deleteManagedUpload(deletedUser.profileImageUrl).catch((error) => {
                console.error('Failed to remove deleted user profile image:', error);
            });
        }

        res.status(200).json({ success: true, message: 'User profile removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createUser,
    getCurrentUser,
    getUser,
    updateCurrentUser,
    updateCurrentUserTwoFactor,
    updateUser,
    changeCurrentUserEmail,
    uploadProfileImage,
    removeProfileImage,
    deleteUser,
    getUsers
};
