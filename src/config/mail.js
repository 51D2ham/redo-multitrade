const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
const hasSmtpCreds = Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);

if (hasSmtpCreds) {
    try {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            }
        });

        // Non-fatal verify: log status, but do not throw
        transporter.verify((err, success) => {
            if (err) {
                console.warn('Warning: mail server verify failed:', err && err.message ? err.message : err);
            } else {
                console.log('Mail server is ready to send messages...');
            }
        });
    } catch (e) {
        console.error('Failed to initialize mail transporter:', e && e.message ? e.message : e);
        transporter = null;
    }
} else {
    console.warn('Mail credentials not provided in environment (GMAIL_USER / GMAIL_PASS). Mailer disabled.');
}

/**
 * sendMail
 * Returns a structured result instead of throwing so callers can decide how to handle mail failures.
 * { success: boolean, info?: object, error?: string }
 */
const sendMail = async (to, subject, html) => {
    if (!transporter) {
        const msg = 'No mail transporter available (missing SMTP credentials or init failed)';
        console.warn('sendMail:', msg);
        return { success: false, error: msg };
    }

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, info };
    } catch (err) {
        console.error('sendMail error:', err && err.message ? err.message : err);
        return { success: false, error: err && err.message ? err.message : String(err) };
    }
};

module.exports = sendMail;