// src/controllers/authController.js
const authService = require('../services/authService');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/emailService');
const { getFrontendUrl, getPublicFrontendUrl } = require('../config/appUrls');

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderVerificationPage = ({
    title,
    message,
    accentColor,
    ctaUrl = '',
    ctaLabel = '',
}) => {
    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);
    const safeCtaUrl = escapeHtml(ctaUrl);
    const safeCtaLabel = escapeHtml(ctaLabel);
    const statusIcon = accentColor === '#16a34a' ? '&#10003;' : '!';
    const ctaMarkup = safeCtaUrl && safeCtaLabel
        ? `
            <a href="${safeCtaUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600;">
                ${safeCtaLabel}
            </a>
        `
        : '';

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${safeTitle}</title>
            </head>
            <body style="margin: 0; background-color: #f4f7fb; font-family: Arial, sans-serif; color: #1f2933;">
                <div style="padding: 32px 16px;">
                    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; padding: 40px 32px; text-align: center; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);">
                        <div style="width: 60px; height: 60px; margin: 0 auto 20px; border-radius: 50%; background-color: ${accentColor}; color: #ffffff; font-size: 28px; line-height: 60px; font-weight: 700;">
                            <span style="font-size: 28px;">${statusIcon}</span>
                        </div>
                        <h1 style="margin: 0 0 12px; font-size: 28px; color: #111827;">${safeTitle}</h1>
                        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">${safeMessage}</p>
                        ${ctaMarkup}
                    </div>
                </div>
            </body>
        </html>
    `;
};

const sendVerificationResponse = (req, res, statusCode, payload) => {
    if (req.accepts(['json', 'html']) === 'html') {
        return res
            .status(statusCode)
            .type('html')
            .send(renderVerificationPage(payload));
    }

    return res.status(statusCode).json({
        success: statusCode < 400,
        message: payload.message,
    });
};

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

        const frontendUrl = getPublicFrontendUrl();

        return sendVerificationResponse(req, res, 200, {
            title: 'Email verified',
            message: 'Your Safe Cycling email address has been verified successfully. You can now log in to your account.',
            accentColor: '#16a34a',
            ctaUrl: frontendUrl,
            ctaLabel: frontendUrl ? 'Open Safe Cycling' : '',
        });
    } catch (error) {
        const friendlyMessage = error.message === 'Invalid or expired verification token'
            ? 'This verification link is invalid, expired, or has already been used.'
            : error.message;

        return sendVerificationResponse(req, res, 400, {
            title: 'Verification failed',
            message: friendlyMessage,
            accentColor: '#dc2626',
            ctaUrl: '',
            ctaLabel: '',
        });
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
