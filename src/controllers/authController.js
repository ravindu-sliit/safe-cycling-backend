// src/controllers/authController.js
const authService = require('../services/authService');

const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/emailService');
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await authService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: result.token,
            user: {
                id: result.user._id,
                name: result.user.name,
                email: result.user.email,
                cyclingStyle: result.user.cyclingStyle,
                profileImageUrl: result.user.profileImageUrl || '',
                role: result.user.role,
                isVerified: result.user.isVerified,
                createdAt: result.user.createdAt,
                updatedAt: result.user.updatedAt
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        await authService.verifyEmailToken(token);

        res.status(200).json({
            success: true,
            message: 'Email successfully verified. You can now log in.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/auth/resetpassword/:token
const redirectToResetPasswordPage = (req, res) => {
    const resetUrl = `${getFrontendUrl()}/reset-password/${req.params.token}`;
    res.redirect(resetUrl);
};

// POST /api/auth/forgotpassword
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const { user, resetToken } = await authService.forgotPassword(email);

        const resetUrl = `${getFrontendUrl()}/reset-password/${resetToken}`;
        console.log(`Password reset URL for ${user.email}: ${resetUrl}`);

        await sendPasswordResetEmail(user.email, user.name, resetUrl);

        res.status(200).json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
        const statusCode = error.message === 'There is no user registered with that email address.' ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// PUT /api/auth/resetpassword/:token
const resetPassword = async (req, res) => {
    try {
        const user = await authService.resetPassword(req.params.token, req.body.password);

        await sendPasswordChangedEmail(user.email, user.name);

        res.status(200).json({
            success: true,
            message: 'Password has been successfully reset. You can now log in.'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    login,
    verifyEmail,
    redirectToResetPasswordPage,
    forgotPassword,
    resetPassword
};
