const nodemailer = require('nodemailer');
require('dotenv').config();

// setting up the transporter
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    // verify mail server connection
    transporter.verify((error, success) => {
        if (error) {
            console.log("Error starting mail server:", error);
        } else {
            console.log("Mail server is ready to send messages...");
        }
    });
} catch (error) {
    console.error('Failed to create transporter:', error);
}

// export a function to send email
const sendMail = async (to, subject, html) => {
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        html,
    };

    return transporter.sendMail(mailOptions); // returns a promise
};

module.exports = sendMail;