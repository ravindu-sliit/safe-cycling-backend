const { Resend } = require('resend');

// Initialize Resend with your secret API key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendWelcomeEmail = async (userEmail, userName) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Safe Cycling <onboarding@resend.dev>', 
            to: userEmail, 
            subject: 'Welcome to the Safe Cycling Community! 🚴‍♂️',
            html: `<p>Hi ${userName}, Welcome to Safe Cycling!</p>`
        });

        // If Resend sends back an error, print it!
        if (error) {
            console.error("❌ Resend API Error:", error);
            return;
        }

        console.log("✅ Welcome email sent successfully!");
        return data;
    } catch (error) {
        console.error("❌ Catch Error:", error);
    }
};

module.exports = { sendWelcomeEmail };