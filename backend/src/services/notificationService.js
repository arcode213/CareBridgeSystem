/**
 * Notification Service (Q17) - Multi-channel alerts.
 * Supports WhatsApp (Client Preference), SMS, and Email.
 */

const { sendEmail } = require('../utils/emailService');

exports.sendAlert = async ({ userId, role, type, message, data }) => {
  console.log(`[NOTIFICATION] ${type} for ${role} (${userId}): ${message}`);

  // 1. Email (Implemented)
  if (data && data.email) {
    await sendEmail({
      to: data.email,
      subject: `CareBridge: ${type}`,
      text: message
    });
  }

  // 2. WhatsApp (Q17: Client Preference)
  // Placeholder for Twilio/WATI WhatsApp API
  if (data && data.phone) {
    console.log(`[WHATSAPP] Sending to ${data.phone}: ${message}`);
    // implementation: await whatsappProvider.send(data.phone, message);
  }

  // 3. SMS
  if (data && data.phone && type === 'EMERGENCY') {
    console.log(`[SMS] Emergency alert to ${data.phone}: ${message}`);
    // implementation: await twilio.messages.create({...});
  }
};

exports.notifyNewReferral = async (referral, hospitalOwner) => {
  await exports.sendAlert({
    userId: hospitalOwner._id,
    role: 'hospital',
    type: 'NEW_REFERRAL',
    message: `New referral received: ${referral.referralCode} (${referral.urgency})`,
    data: { email: hospitalOwner.email, phone: hospitalOwner.phone }
  });
};
