const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Configure Transporter
 * For Gmail: host: 'smtp.gmail.com', port: 465, secure: true
 * For Outlook: host: 'smtp.office365.com', port: 587, secure: false
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generic Email Sender
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CareBridge Health" <no-reply@carebridge.com>',
      to,
      subject,
      text: text || '',
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email Sending Failed:', error.message);
    
    // DEVELOPMENT MOCK FALLBACK
    try {
      const emailDir = path.join(__dirname, '../../uploads/emails');
      if (!fs.existsSync(emailDir)) {
        fs.mkdirSync(emailDir, { recursive: true });
      }
      
      const fileName = `email_${Date.now()}_${to.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      const filePath = path.join(emailDir, fileName);
      
      const fileContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>[DEV MOCK] ${subject}</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: #eff6ff; color: #1e40af; padding: 12px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; text-align: center;">
              📬 DEVELOPMENT EMAIL MOCK FALLBACK
            </div>
            <p><strong>To:</strong> ${to}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            ${html || `<pre style="white-space: pre-wrap;">${text}</pre>`}
          </div>
        </body>
        </html>
      `;
      
      fs.writeFileSync(filePath, fileContent, 'utf8');
      
      console.log('\n=============================================================');
      console.log('📬 [DEVELOPMENT EMAIL MOCKED]');
      console.log(`TO:         ${to}`);
      console.log(`SUBJECT:    ${subject}`);
      console.log(`LOCAL FILE: file:///${filePath.replace(/\\/g, '/')}`);
      
      // Extract links if any
      const linkMatches = (html || text).match(/href="([^"]+)"/g);
      if (linkMatches) {
        console.log('\n🎯 DETECTED ACTION LINKS:');
        linkMatches.forEach(match => {
          const url = match.slice(6, -1);
          console.log(`   - ${url}`);
        });
      }
      console.log('=============================================================\n');
    } catch (writeErr) {
      console.error('Failed to write mock email file:', writeErr.message);
    }

    return { success: false, error: error.message };
  }
};

/**
 * Verification Email Template
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #2563eb; font-size: 28px; font-weight: bold; text-decoration: none; }
        .card { background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="#" class="logo">CareBridge Health</a>
        </div>
        <div class="card">
          <h2 style="margin-top: 0;">Welcome to the Platform!</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Thank you for joining CareBridge Health. To get started and secure your account, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Email</a>
          </div>
          <p style="font-size: 14px; color: #4b5563;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${verificationUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} CareBridge Health. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Verify Your Email - CareBridge Health',
    html,
    text: `Welcome to CareBridge Health! Verify your email here: ${verificationUrl}`,
  });
};

const sendResetPasswordEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #2563eb; font-size: 28px; font-weight: bold; text-decoration: none; }
        .card { background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="#" class="logo">CareBridge Health</a>
        </div>
        <div class="card">
          <h2 style="margin-top: 0;">Reset Your Password</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You requested a password reset for your CareBridge Health account. Click the button below to set a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #4b5563;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${resetUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">If you did not request this, you can safely ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} CareBridge Health. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password - CareBridge Health',
    html,
    text: `Reset your password here: ${resetUrl}`,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
};

