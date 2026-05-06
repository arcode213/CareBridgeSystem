const nodemailer = require('nodemailer');
const { MailtrapClient } = require('mailtrap');

const MAILTRAP_TOKEN = process.env.MAILTRAP_TOKEN;
let mailtrapClient = null;

if (MAILTRAP_TOKEN && MAILTRAP_TOKEN !== 'your_token_here') {
  mailtrapClient = new MailtrapClient({ token: MAILTRAP_TOKEN });
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isSmtpConfigured = process.env.EMAIL_USER && process.env.EMAIL_USER.length > 5;

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  // 1. Try Mailtrap SDK first (Production/Sending API)
  if (mailtrapClient) {
    try {
      await mailtrapClient.send({
        from: { email: "hello@demomailtrap.co", name: "CareBridge Health" },
        to: [{ email: user.email }],
        subject: "Verify Your Email - CareBridge Health",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Welcome to CareBridge Health!</h2>
            <p>Hello ${user.name},</p>
            <p>Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
            </div>
            <p style="color: #666; font-size: 12px;">Link: ${verificationUrl}</p>
          </div>
        `,
        category: "Verification",
      });
      console.log(`Verification email sent via Mailtrap SDK to ${user.email}`);
      return;
    } catch (error) {
      console.error('Mailtrap SDK sending failed:', error.message);
      // Fallback to SMTP or Log
    }
  }

  // 2. Try SMTP second (Nodemailer)
  if (isSmtpConfigured) {
    try {
      await transporter.sendMail({
        from: '"CareBridge Health" <no-reply@carebridge.com>',
        to: user.email,
        subject: 'Verify Your Email - CareBridge Health',
        html: `<p>Verify here: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
      });
      console.log(`Verification email sent via SMTP to ${user.email}`);
      return;
    } catch (error) {
      console.error('SMTP sending failed:', error.message);
    }
  }

  // 3. Final Fallback: Log to Console (Development)
  console.warn('--- EMAIL NOT SENT (NO CONFIG) ---');
  console.warn(`To: ${user.email}`);
  console.warn(`Verification Link: ${verificationUrl}`);
};

module.exports = { sendVerificationEmail };
