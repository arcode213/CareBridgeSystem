/**
 * Notification Service — Multi-channel alerts.
 * 
 * Channel priority: WhatsApp (primary) → Email (secondary)
 * 
 * All notification types route through sendAlert(). Caller passes:
 *   userId, role, type, message, data: { email?, phone?, name? }
 */

const User = require('../models/User');
const { sendNotificationEmail } = require('../utils/emailService');
const { sendWhatsApp } = require('../utils/whatsappService');

const notifyAllAdmins = async (type, message, extraData = {}) => {
  const admins = await User.find({ role: 'admin', status: 'active' })
    .select('name email phone')
    .lean();
  if (!admins.length) return [];

  return Promise.allSettled(
    admins.map((admin) =>
      exports.sendAlert({
        userId: admin._id,
        role: 'admin',
        type,
        message,
        data: {
          email: admin.email,
          phone: admin.phone,
          name: admin.name,
          ...extraData,
        },
      })
    )
  );
};

// ─── WhatsApp message templates ─────────────────────────────────────────────

const buildWhatsAppBody = (type, name, message, data = {}) => {
  const greeting = name ? `Hello *${name}*,\n\n` : '';

  const templates = {
    // Auth
    LOGIN_ALERT: () =>
      `🔐 *CareBridge Health* — Login Alert\n\n${greeting}` +
      `A new login was detected on your account at *${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}*.\n\n` +
      `If this was you, no action is needed. If not, please reset your password immediately.`,

    PASSWORD_CHANGED: () =>
      `🔑 *CareBridge Health* — Password Changed\n\n${greeting}` +
      `Your account password was successfully updated.\n\n` +
      `If you did not make this change, contact platform support immediately.`,

    // Referrals
    NEW_REFERRAL: () =>
      `📋 *CareBridge Health* — New Referral\n\n${greeting}` +
      `You have received a new referral: *${data.referralCode || ''}* (${data.urgency || 'Standard'}).\n\n` +
      `Log in to review and respond promptly.`,

    REFERRAL_ACCEPTED: () =>
      `✅ *CareBridge Health* — Referral Accepted\n\n${greeting}` +
      `Your referral *${data.referralCode || ''}* has been accepted by ${data.hospitalName || 'the hospital'}.\n\n` +
      `The patient transfer can now proceed.`,

    REFERRAL_REJECTED: () =>
      `❌ *CareBridge Health* — Referral Declined\n\n${greeting}` +
      `Your referral *${data.referralCode || ''}* was declined.\n` +
      (data.reason ? `Reason: ${data.reason}\n` : '') +
      `\nPlease review and consider alternative options.`,

    REFERRAL_ESCALATED: () =>
      `⚠️ *CareBridge Health* — Referral Escalated\n\n${greeting}` +
      `Referral *${data.referralCode || ''}* has been escalated due to inactivity.\n\n` +
      `Immediate attention is required.`,

    // Admissions & Billing
    ADMISSION_CREATED: () =>
      `🏥 *CareBridge Health* — Patient Admitted\n\n${greeting}` +
      `A patient has been admitted under referral *${data.referralCode || ''}*.\n\n` +
      `Admission tracking is now active on your dashboard.`,

    BILL_GENERATED: () =>
      `💳 *CareBridge Health* — Bill Generated\n\n${greeting}` +
      `A bill of *PKR ${data.amount || ''}* has been generated for admission *${data.admissionId || ''}*.\n\n` +
      `Please review it in your dashboard.`,

    // Settlements
    SETTLEMENT_CREATED: () =>
      `📊 *CareBridge Health* — Weekly Settlement Created\n\n${greeting}` +
      `A new weekly settlement has been submitted by *${data.hospitalName || 'the hospital'}*.\n\n` +
      `Gross: PKR ${data.grossAmount || ''} | Platform Cut: PKR ${data.platformCut || ''}\n\n` +
      `Log in to review and take action.`,

    HOSPITAL_RECEIPT_UPLOADED: () =>
      `🧾 *CareBridge Health* — Payment Receipt Uploaded\n\n${greeting}` +
      `Hospital *${data.hospitalName || ''}* has uploaded a payment receipt for settlement.\n\n` +
      `Please verify the receipt in the Admin Settlements dashboard.`,

    SETTLEMENT_VERIFIED: () =>
      `✅ *CareBridge Health* — Settlement Verified\n\n${greeting}` +
      `Your payment receipt has been verified by admin.\n\n` +
      `The platform will now process consultant payouts shortly.`,

    SETTLEMENT_REJECTED: () =>
      `❌ *CareBridge Health* — Receipt Rejected\n\n${greeting}` +
      `Your payment receipt was rejected.\n` +
      (data.reason ? `Reason: *${data.reason}*\n` : '') +
      `\nPlease re-upload a valid receipt in the Settlements dashboard.`,

    CONSULTANT_PAYOUT_UPLOADED: () =>
      `💰 *CareBridge Health* — Payout Sent\n\n${greeting}` +
      `Your payout of *PKR ${data.amount || ''}* has been processed by admin.\n\n` +
      `Please confirm receipt in your Earnings dashboard.`,

    PAYOUT_VERIFIED: () =>
      `🎉 *CareBridge Health* — Payout Confirmed\n\n${greeting}` +
      `A payout of *PKR ${data.amount || ''}* has been confirmed by the consultant.\n\n` +
      `Settlement cycle is now complete.`,

    // Admin actions
    ACCOUNT_APPROVED: () =>
      `🎉 *CareBridge Health* — Account Approved\n\n${greeting}` +
      `Congratulations! Your account has been approved by the admin.\n\n` +
      `You can now log in and access all platform features.`,

    ACCOUNT_SUSPENDED: () =>
      `⚠️ *CareBridge Health* — Account Suspended\n\n${greeting}` +
      `Your account has been suspended.\n\n` +
      `Please contact platform support for more information.`,

    // Lab Notifications
    LAB_ORDER_RECEIVED: () =>
      `🔬 *CareBridge Health* — New Lab Order\n\n${greeting}` +
      `You have received a new lab order for patient *${data.patientName || 'Unknown'}* (Ref: ${data.referralCode || ''}).\n\n` +
      `Please check your dashboard for details.`,

    LAB_STATUS_UPDATE: () =>
      `🧪 *CareBridge Health* — Lab Status Update\n\n${greeting}` +
      `The lab investigation for patient *${data.patientName || 'Unknown'}* (Ref: ${data.referralCode || ''}) is now: *${data.status || ''}*.\n\n` +
      `You can track the progress on your dashboard.`,

    LAB_CRITICAL_VALUE: () =>
      `🚨 *CRITICAL VALUE DETECTED*\n\n${greeting}` +
      `A panic value was detected in the lab investigation for patient *${data.patientName || 'Unknown'}* (Ref: ${data.referralCode || ''}).\n\n` +
      `Urgent action is required! Please review the results immediately.`,

    LAB_REPORT_READY: () =>
      `📄 *CareBridge Health* — Lab Report Ready\n\n${greeting}` +
      `The lab report for patient *${data.patientName || 'Unknown'}* (Ref: ${data.referralCode || ''}) has been uploaded successfully.\n\n` +
      (data.reportUrl ? `Report Link: ${data.reportUrl}\n\n` : '') +
      `Please check your dashboard to view the full report.`,

    // Generic / Admin broadcast
    ADMIN_BROADCAST: () =>
      `📢 *CareBridge Health* — Platform Notice\n\n${greeting}${message}`,
  };

  const builder = templates[type];
  if (builder) return builder();

  // Fallback: raw message
  return `📌 *CareBridge Health*\n\n${greeting}${message}`;
};

// ─── Core sendAlert ──────────────────────────────────────────────────────────

exports.sendAlert = async ({ userId, role, type, message, data = {} }) => {
  console.log(`[NOTIFICATION] ${type} for ${role} (${userId}): ${message}`);

  const results = {};

  // 1. WhatsApp (primary channel)
  if (data.phone) {
    const body = buildWhatsAppBody(type, data.name, message, data);
    results.whatsapp = await sendWhatsApp(data.phone, body);
  }

  // 2. Email (secondary / audit trail)
  if (data.email) {
    try {
      results.email = await sendNotificationEmail(type, role, data, message);
    } catch (err) {
      console.error('[NOTIFICATION] Email error:', err.message);
      results.email = { success: false, error: err.message };
    }
  }

  return results;
};

// ─── Convenience helpers ─────────────────────────────────────────────────────

exports.notifyNewReferral = async (referral, recipient) => {
  return exports.sendAlert({
    userId: recipient._id,
    role: recipient.role || 'hospital',
    type: 'NEW_REFERRAL',
    message: `New referral received: ${referral.referralCode} (${referral.urgency})`,
    data: {
      email: recipient.email,
      phone: recipient.phone,
      name: recipient.name,
      referralCode: referral.referralCode,
      urgency: referral.urgency,
    },
  });
};

exports.notifyReferralAccepted = async (referral, consultant, hospitalName) => {
  return exports.sendAlert({
    userId: consultant._id,
    role: 'consultant',
    type: 'REFERRAL_ACCEPTED',
    message: `Referral ${referral.referralCode} accepted`,
    data: {
      email: consultant.email,
      phone: consultant.phone,
      name: consultant.name,
      referralCode: referral.referralCode,
      hospitalName: hospitalName || '',
    },
  });
};

exports.notifyReferralRejected = async (referral, consultant, reason) => {
  return exports.sendAlert({
    userId: consultant._id,
    role: 'consultant',
    type: 'REFERRAL_REJECTED',
    message: `Referral ${referral.referralCode} rejected`,
    data: {
      email: consultant.email,
      phone: consultant.phone,
      name: consultant.name,
      referralCode: referral.referralCode,
      reason,
    },
  });
};

exports.notifyAccountApproved = async (user) => {
  return exports.sendAlert({
    userId: user._id,
    role: user.role,
    type: 'ACCOUNT_APPROVED',
    message: `Your CareBridge account has been approved.`,
    data: { email: user.email, phone: user.phone, name: user.name },
  });
};

exports.notifyAccountSuspended = async (user) => {
  return exports.sendAlert({
    userId: user._id,
    role: user.role,
    type: 'ACCOUNT_SUSPENDED',
    message: `Your CareBridge account has been suspended.`,
    data: { email: user.email, phone: user.phone, name: user.name },
  });
};

exports.notifySettlementCreated = async (settlement, hospital) => {
  return notifyAllAdmins('SETTLEMENT_CREATED', `New weekly settlement submitted by ${hospital.hospitalName || hospital.name}`, {
    hospitalName: hospital.hospitalName || hospital.name,
    grossAmount: (settlement.grossAmountPaisa / 100).toFixed(2),
    platformCut: (settlement.calculatedPlatformCutPaisa / 100).toFixed(2),
  });
};

exports.notifyAllAdmins = notifyAllAdmins;

exports.notifyReceiptUploaded = async (adminUser, hospitalName) => {
  return exports.sendAlert({
    userId: adminUser._id,
    role: 'admin',
    type: 'HOSPITAL_RECEIPT_UPLOADED',
    message: `${hospitalName} uploaded a payment receipt for verification`,
    data: { email: adminUser.email, phone: adminUser.phone, name: adminUser.name, hospitalName },
  });
};

exports.notifySettlementVerified = async (hospitalUser) => {
  return exports.sendAlert({
    userId: hospitalUser._id,
    role: 'hospital',
    type: 'SETTLEMENT_VERIFIED',
    message: `Your payment receipt has been verified.`,
    data: { email: hospitalUser.email, phone: hospitalUser.phone, name: hospitalUser.name },
  });
};

exports.notifySettlementRejected = async (hospitalUser, reason) => {
  return exports.sendAlert({
    userId: hospitalUser._id,
    role: 'hospital',
    type: 'SETTLEMENT_REJECTED',
    message: `Your payment receipt was rejected: ${reason}`,
    data: { email: hospitalUser.email, phone: hospitalUser.phone, name: hospitalUser.name, reason },
  });
};

exports.notifyConsultantPayout = async (consultantUser, amountPaisa) => {
  return exports.sendAlert({
    userId: consultantUser._id,
    role: 'consultant',
    type: 'CONSULTANT_PAYOUT_UPLOADED',
    message: `Payout of PKR ${(amountPaisa / 100).toFixed(2)} processed for you.`,
    data: {
      email: consultantUser.email,
      phone: consultantUser.phone,
      name: consultantUser.name,
      amount: (amountPaisa / 100).toFixed(2),
    },
  });
};

exports.notifyLoginAlert = async (user) => {
  return exports.sendAlert({
    userId: user._id,
    role: user.role,
    type: 'LOGIN_ALERT',
    message: `New login detected on your account.`,
    data: { email: user.email, phone: user.phone, name: user.name },
  });
};

exports.notifyPasswordChanged = async (user) => {
  return exports.sendAlert({
    userId: user._id,
    role: user.role,
    type: 'PASSWORD_CHANGED',
    message: `Your password was successfully changed.`,
    data: { email: user.email, phone: user.phone, name: user.name },
  });
};

exports.notifyLabOrderReceived = async (labUser, referral) => {
  return exports.sendAlert({
    userId: labUser._id,
    role: 'laboratory',
    type: 'LAB_ORDER_RECEIVED',
    message: `New lab order received for ${referral.patientName}`,
    data: {
      email: labUser.email,
      phone: labUser.phone,
      name: labUser.name,
      patientName: referral.patientName,
      referralCode: referral.referralCode,
    },
  });
};

exports.notifyLabStatusUpdate = async (consultantUser, referral, statusStr) => {
  return exports.sendAlert({
    userId: consultantUser._id,
    role: 'consultant',
    type: 'LAB_STATUS_UPDATE',
    message: `Lab status updated to ${statusStr} for ${referral.patientName}`,
    data: {
      email: consultantUser.email,
      phone: consultantUser.phone,
      name: consultantUser.name,
      patientName: referral.patientName,
      referralCode: referral.referralCode,
      status: statusStr,
    },
  });
};

exports.notifyLabCriticalValue = async (consultantUser, referral) => {
  return exports.sendAlert({
    userId: consultantUser._id,
    role: 'consultant',
    type: 'LAB_CRITICAL_VALUE',
    message: `CRITICAL VALUE detected for ${referral.patientName}`,
    data: {
      email: consultantUser.email,
      phone: consultantUser.phone,
      name: consultantUser.name,
      patientName: referral.patientName,
      referralCode: referral.referralCode,
    },
  });
};

exports.notifyLabReportReady = async (consultantUser, referral, reportUrl) => {
  return exports.sendAlert({
    userId: consultantUser._id,
    role: 'consultant',
    type: 'LAB_REPORT_READY',
    message: `Lab report ready for ${referral.patientName}`,
    data: {
      email: consultantUser.email,
      phone: consultantUser.phone,
      name: consultantUser.name,
      patientName: referral.patientName,
      referralCode: referral.referralCode,
      reportUrl,
    },
  });
};
