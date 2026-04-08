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

const getReplyToEmail = () => {
    const replyToEmail = getEnvValue('SMTP_FROM_EMAIL') || getEnvValue('SMTP_USER');

    if (!replyToEmail) {
        throw new Error('SMTP_FROM_EMAIL is not configured.');
    }

    return replyToEmail;
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEmailLayout = ({
    preheader,
    heading,
    intro,
    paragraphs = [],
    buttonLabel,
    buttonUrl,
    accentColor,
    fallbackNote,
}) => {
    const safeHeading = escapeHtml(heading);
    const safeIntro = escapeHtml(intro);
    const safeButtonLabel = escapeHtml(buttonLabel);
    const safeButtonUrl = escapeHtml(buttonUrl);
    const safePreheader = escapeHtml(preheader);
    const safeFallbackNote = escapeHtml(fallbackNote);
    const paragraphMarkup = paragraphs
        .map((paragraph) => `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #475467;">${escapeHtml(paragraph)}</p>`)
        .join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${safeHeading}</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: Arial, sans-serif; color: #101828;">
                <span style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
                    ${safePreheader}
                </span>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eef2f6; padding: 24px 12px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 40px 36px 12px; text-align: center;">
                                        <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: ${accentColor}; font-weight: 700;">
                                            Safe Cycling
                                        </p>
                                        <h1 style="margin: 16px 0 12px; font-size: 30px; line-height: 1.25; color: #101828;">${safeHeading}</h1>
                                        <p style="margin: 0 0 28px; font-size: 17px; line-height: 1.6; color: #475467;">${safeIntro}</p>
                                        ${paragraphMarkup}
                                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto 16px;">
                                            <tr>
                                                <td align="center" bgcolor="${accentColor}" style="border-radius: 999px;">
                                                    <a href="${safeButtonUrl}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none;">
                                                        ${safeButtonLabel}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 24px 0 8px; font-size: 13px; line-height: 1.6; color: #667085;">${safeFallbackNote}</p>
                                        <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #0b6bcb; word-break: break-all;">
                                            <a href="${safeButtonUrl}" style="color: #0b6bcb; text-decoration: underline;">${safeButtonUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 36px 36px; text-align: center;">
                                        <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #98a2b3;">
                                            If you did not expect this message, you can safely ignore it.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;
};

const sendEmail = async ({ to, subject, html, text, successMessage }) => {
    try {
        const transporter = nodemailer.createTransport(getMailerConfig());
        const info = await transporter.sendMail({
            from: getFromEmail(),
            replyTo: getReplyToEmail(),
            to,
            subject,
            html,
            text,
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
    const displayName = userName || 'there';

    return sendEmail({
        to: userEmail,
        subject: 'Verify your Safe Cycling email address',
        successMessage: 'Verification email sent successfully.',
        text: [
            `Hi ${displayName},`,
            '',
            'Welcome to Safe Cycling.',
            'Please verify your email address by opening the link below:',
            verificationUrl,
            '',
            'If you did not create this account, you can ignore this email.',
        ].join('\n'),
        html: buildEmailLayout({
            preheader: 'Verify your Safe Cycling email address.',
            heading: `Hi ${displayName}, welcome to Safe Cycling`,
            intro: 'Please confirm your email address to finish setting up your account.',
            paragraphs: [
                'Use the button below to verify your email address and activate your account.',
            ],
            buttonLabel: 'Verify email address',
            buttonUrl: verificationUrl,
            accentColor: '#16a34a',
            fallbackNote: 'If the button does not open, copy and paste this link into your browser:',
        }),
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
