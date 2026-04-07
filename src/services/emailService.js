const nodemailer = require('nodemailer');

const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : '';
};

const getMailerConfig = () => {
    const smtpUser = getEnvValue('SMTP_USER');
    const smtpPassword = getEnvValue('SMTP_APP_PASSWORD').replace(/\s+/g, '');

    if (!smtpUser) {
        throw new Error('SMTP_USER is not configured.');
    }

    if (!smtpPassword) {
        throw new Error('SMTP_APP_PASSWORD is not configured.');
    }

    return {
        service: 'gmail',
        auth: {
            user: smtpUser,
            pass: smtpPassword,
        },
    };
};

const getFromEmail = () => {
    const fromEmail = getEnvValue('SMTP_FROM_EMAIL') || getEnvValue('SMTP_USER');

    if (!fromEmail) {
        throw new Error('SMTP_FROM_EMAIL is not configured.');
    }

    return `Safe Cycling <${fromEmail}>`;
};

const sendEmail = async ({ to, subject, html, successMessage }) => {
    try {
        const transporter = nodemailer.createTransport(getMailerConfig());
        const info = await transporter.sendMail({
            from: getFromEmail(),
            to,
            subject,
            html,
        });

        console.log(successMessage);
        return info;
    } catch (error) {
        const errorMessage = error.message || 'Unknown email error.';
        if (/Invalid login|Username and Password not accepted|Missing credentials/i.test(errorMessage)) {
            console.error('Email service error: Gmail rejected the login. Check SMTP_USER, remove spaces from SMTP_APP_PASSWORD, confirm 2-Step Verification is enabled, and make sure this is a Gmail App Password.');
            throw new Error('Gmail rejected the login. Check your Gmail address, App Password, and 2-Step Verification settings.');
        }

        console.error('Email service error:', errorMessage);
        throw error;
    }
};

const sendWelcomeEmail = async (userEmail, userName, verificationUrl) => {
    return sendEmail({
        to: userEmail,
        subject: 'Welcome to Safe Cycling - Verify Your Account!',
        successMessage: 'Verification email sent successfully.',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Hi ${userName}, Welcome to Safe Cycling!</h2>
                <p style="color: #555; font-size: 16px;">We are so excited to have you in our community.</p>
                <p style="color: #555; font-size: 16px;">Please verify your email address to activate your account by clicking the button below:</p>
                <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                    Verify My Account
                </a>
                <p style="font-size: 12px; color: #777; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #0066cc; word-break: break-all;">${verificationUrl}</p>
            </div>
        `,
    });
};

const sendPasswordResetEmail = async (userEmail, userName, resetUrl) => {
    return sendEmail({
        to: userEmail,
        subject: 'Safe Cycling - Password Reset Request',
        successMessage: 'Password reset email sent successfully.',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Hi ${userName},</h2>
                <p style="color: #555; font-size: 16px;">You are receiving this email because you (or someone else) requested a password reset for your Safe Cycling account.</p>
                <p style="color: #555; font-size: 16px;">Please click the button below to choose a new password. <strong>This link will expire in 10 minutes.</strong></p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                    Reset Password
                </a>
                <p style="font-size: 12px; color: #777; margin-top: 20px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
            </div>
        `,
    });
};

const sendPasswordChangedEmail = async (userEmail, userName) => {
    return sendEmail({
        to: userEmail,
        subject: 'Safe Cycling - Password Changed Successfully',
        successMessage: 'Password confirmation email sent successfully.',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Hi ${userName},</h2>
                <p style="color: #555; font-size: 16px;">Your Safe Cycling account password has been successfully updated.</p>
                <p style="color: #555; font-size: 16px;">You can now log in to the app using your new password.</p>
                <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 5px solid #ffc107; text-align: left;">
                    <p style="font-size: 12px; color: #856404; margin: 0;">
                        <strong>Security Alert:</strong> If you did not make this change, please contact our support team immediately to secure your account.
                    </p>
                </div>
            </div>
        `,
    });
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail };
