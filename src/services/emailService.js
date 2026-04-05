const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ADDED: verificationUrl as the third parameter
const sendWelcomeEmail = async (userEmail, userName, verificationUrl) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Safe Cycling <onboarding@resend.dev>', 
            to: userEmail, 
            subject: 'Welcome to Safe Cycling - Verify Your Account! 🚴‍♂️',
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
            `
        });
        
        if (error) {
            console.error("❌ Resend API Error:", error);
            return;
        }

        console.log("✅ Verification email sent successfully!");
        return data;
    } catch (error) {
        console.error("❌ Catch Error:", error);
    }
};

// ADD THIS BELOW sendWelcomeEmail
const sendPasswordResetEmail = async (userEmail, userName, resetUrl) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Safe Cycling <onboarding@resend.dev>', 
            to: userEmail, 
            subject: 'Safe Cycling - Password Reset Request 🔒',
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
            `
        });
        
        if (error) {
            console.error("❌ Resend API Error:", error);
            return;
        }

        console.log("✅ Password Reset email sent successfully!");
        return data;
    } catch (error) {
        console.error("❌ Catch Error:", error);
    }
};

// ADD THIS BELOW sendPasswordResetEmail
const sendPasswordChangedEmail = async (userEmail, userName) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Safe Cycling <onboarding@resend.dev>', 
            to: userEmail, 
            subject: 'Safe Cycling - Password Changed Successfully ✅',
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
            `
        });
        
        if (error) {
            console.error("❌ Resend API Error:", error);
            return;
        }

        console.log("✅ Password Confirmation email sent successfully!");
        return data;
    } catch (error) {
        console.error("❌ Catch Error:", error);
    }
};


// Don't forget to export the new function at the bottom!
module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail };
