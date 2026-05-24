/**
 * HTML email templates — table layout + inline CSS for Gmail/Outlook compatibility.
 */

const BRAND = {
  name: 'CareBridge Health',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  accent: '#0ea5e9',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  card: '#ffffff',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const baseLayout = ({ preheader, bodyRows, footerNote }) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${BRAND.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.primary};border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;width:48px;height:48px;background-color:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:22px;font-weight:800;color:#ffffff;margin-bottom:12px;">CB</div>
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${BRAND.name}</h1>
                    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Digital Referral Management Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background-color:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:36px 32px;">
              ${bodyRows}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};line-height:1.5;">
                ${footerNote || 'This is an automated message from CareBridge Health. Please do not reply to this email.'}
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} ${BRAND.name} &middot; Pakistan
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ctaButton = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:${BRAND.primary};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background-color:${BRAND.primary};border:1px solid ${BRAND.primaryDark};">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;

const infoBox = (content) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
  <tr>
    <td style="background-color:#f8fafc;border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.accent};border-radius:8px;padding:16px 18px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">${content}</p>
    </td>
  </tr>
</table>`;

const linkFallback = (url) => `
<p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.5;">Or copy and paste this link into your browser:</p>
<p style="margin:8px 0 0;font-size:12px;word-break:break-all;">
  <a href="${url}" style="color:${BRAND.primary};text-decoration:underline;">${escapeHtml(url)}</a>
</p>`;

const verificationEmailHtml = (user, verificationUrl) => {
  const name = escapeHtml(user.name);
  const bodyRows = `
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.accent};">Account verification</p>
    <h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.text};letter-spacing:-0.02em;line-height:1.3;">Verify your email address</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${BRAND.text};">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      Thank you for registering with <strong style="color:${BRAND.text};">${BRAND.name}</strong>. To activate your account and complete registration, please confirm that this email address belongs to you.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      Click the button below to verify your email. This link expires in <strong style="color:${BRAND.text};">24 hours</strong>.
    </p>
    ${ctaButton(verificationUrl, 'Verify email address')}
    ${linkFallback(verificationUrl)}
    ${infoBox(
      '<strong style="color:#475569;">Security tip:</strong> If you did not create a CareBridge account, you can safely ignore this message. No changes will be made to your email address.'
    )}
  `;

  return baseLayout({
    preheader: `Verify your ${BRAND.name} account — one click to complete registration.`,
    bodyRows,
  });
};

const resetPasswordEmailHtml = (user, resetUrl) => {
  const name = escapeHtml(user.name);
  const bodyRows = `
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.accent};">Password reset</p>
    <h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.text};letter-spacing:-0.02em;line-height:1.3;">Reset your password</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${BRAND.text};">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      We received a request to reset the password for your ${BRAND.name} account. Use the button below to choose a new password.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      This link expires in <strong style="color:${BRAND.text};">1 hour</strong> for your security.
    </p>
    ${ctaButton(resetUrl, 'Reset password')}
    ${linkFallback(resetUrl)}
    ${infoBox(
      '<strong style="color:#475569;">Did not request this?</strong> Ignore this email and your password will remain unchanged. Contact support if you are concerned about your account security.'
    )}
  `;

  return baseLayout({
    preheader: `Reset your ${BRAND.name} password securely.`,
    bodyRows,
  });
};

const verificationEmailText = (user, verificationUrl) =>
  `${BRAND.name}\n` +
  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
  `Verify your email address\n\n` +
  `Hello ${user.name},\n\n` +
  `Thank you for registering with ${BRAND.name}. Please verify your email to activate your account.\n\n` +
  `Verify here (expires in 24 hours):\n${verificationUrl}\n\n` +
  `If you did not create this account, ignore this email.\n\n` +
  `— ${BRAND.name}`;

const resetPasswordEmailText = (user, resetUrl) =>
  `${BRAND.name}\n` +
  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
  `Reset your password\n\n` +
  `Hello ${user.name},\n\n` +
  `Reset your password using this link (expires in 1 hour):\n${resetUrl}\n\n` +
  `If you did not request this, ignore this email.\n\n` +
  `— ${BRAND.name}`;

module.exports = {
  verificationEmailHtml,
  resetPasswordEmailHtml,
  verificationEmailText,
  resetPasswordEmailText,
};
