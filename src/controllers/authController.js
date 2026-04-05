// src/controllers/authController.js
const authService = require('../services/authService');


const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/emailService');

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Call the service layer to do the heavy lifting
        const result = await authService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: result.token,
            // Send back the user details (but NOT the password)
            user: {
                id: result.user._id,
                name: result.user.name,
                email: result.user.email,
                cyclingStyle: result.user.cyclingStyle
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        // We will pass the token in the URL (e.g., /api/auth/verify/:token)
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

// POST /api/auth/forgotpassword
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const { user, resetToken } = await authService.forgotPassword(email);

        // Create the reset URL (pointing to your backend for Postman testing)
        const resetUrl = `http://localhost:5000/api/auth/resetpassword/${resetToken}`;

        // Send the email
        await sendPasswordResetEmail(user.email, user.name, resetUrl);

        res.status(200).json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// PUT /api/auth/resetpassword/:token
const resetPassword = async (req, res) => {
    try {
        // Grab the user object returned by your service layer
        const user = await authService.resetPassword(req.params.token, req.body.password);

        // --- NEW: Trigger the confirmation email ---
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
    forgotPassword,
    resetPassword
};