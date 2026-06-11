const mongoose = require('mongoose');
const Laboratory = require('../models/Laboratory');
const LabReferral = require('../models/LabReferral');
const LabPayout = require('../models/LabPayout');
const User = require('../models/User');
const { logAction } = require('../utils/logger');
const notificationService = require('../services/notificationService');

/** List labs, optionally filtered by owner-user status (?status=pending|active|suspended). */
exports.listLabs = async (req, res) => {
  try {
    const labs = await Laboratory.find()
      .populate('userId', 'name email phone status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const { status } = req.query;
    const filtered = status ? labs.filter((l) => l.userId?.status === status) : labs;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[ADMIN_LIST_LABS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to list laboratories' });
  }
};

exports.getLab = async (req, res) => {
  try {
    const lab = await Laboratory.findById(req.params.id).populate('userId', 'name email phone status createdAt');
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory not found' });
    }
    res.json({ success: true, data: lab });
  } catch (error) {
    console.error('[ADMIN_GET_LAB_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch laboratory' });
  }
};

/** Approve / suspend a laboratory — mirrors adminController.updateUserStatus hospital branch. */
exports.setLabStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or suspended' });
    }

    const lab = await Laboratory.findById(req.params.id);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory not found' });
    }
    const user = await User.findOne({ _id: lab.userId, role: 'laboratory' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Laboratory owner account not found' });
    }

    user.status = status;
    if (status === 'active') {
      user.isPhoneVerified = true;
      user.isEmailVerified = true;
    }
    await user.save();

    lab.isActive = status === 'active';
    lab.isRegistrationVerified = status === 'active';
    await lab.save();

    await logAction({
      actorId: req.user.id,
      action: status === 'active' ? 'LAB_APPROVED' : 'LAB_SUSPENDED',
      entityId: lab._id,
      entityModel: 'Laboratory',
      details: { labName: lab.labName },
    });

    const notify = status === 'active' ? notificationService.notifyAccountApproved : notificationService.notifyAccountSuspended;
    notify(user).catch((err) => console.error('Lab status notify failed:', err.message));

    res.json({ success: true, message: `Laboratory ${status === 'active' ? 'approved' : 'suspended'}`, data: lab });
  } catch (error) {
    console.error('[ADMIN_SET_LAB_STATUS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to update laboratory status' });
  }
};

/** Update admin-controlled economics: platform deduction % and max consultant discount %. */
exports.updateLab = async (req, res) => {
  try {
    const lab = await Laboratory.findById(req.params.id);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory not found' });
    }

    const {
      deductionPercentage,
      maxConsultantDiscountPercentage,
      labName,
      registrationNumber,
      city,
      area,
      address,
    } = req.body;
    if (deductionPercentage != null) {
      const d = Number(deductionPercentage);
      if (!Number.isFinite(d) || d < 0 || d > 100) {
        return res.status(400).json({ success: false, message: 'deductionPercentage must be between 0 and 100' });
      }
      lab.deductionPercentage = d;
    }
    if (maxConsultantDiscountPercentage != null) {
      const m = Number(maxConsultantDiscountPercentage);
      if (!Number.isFinite(m) || m < 0 || m > 100) {
        return res.status(400).json({ success: false, message: 'maxConsultantDiscountPercentage must be between 0 and 100' });
      }
      lab.maxConsultantDiscountPercentage = m;
    }
    // Profile fields (admin-editable)
    if (labName != null && String(labName).trim()) lab.labName = String(labName).trim();
    if (registrationNumber != null) lab.registrationNumber = String(registrationNumber).trim();
    if (city != null) lab.city = String(city).trim();
    if (area != null) lab.area = String(area).trim();
    if (address != null) lab.address = String(address).trim();

    await lab.save();

    await logAction({
      actorId: req.user.id,
      action: 'LAB_UPDATED',
      entityId: lab._id,
      entityModel: 'Laboratory',
      details: { deductionPercentage: lab.deductionPercentage, maxConsultantDiscountPercentage: lab.maxConsultantDiscountPercentage },
    });

    res.json({ success: true, data: lab });
  } catch (error) {
    console.error('[ADMIN_UPDATE_LAB_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to update laboratory' });
  }
};

/** Oversight: list lab referrals (optionally for a single lab via ?laboratoryId=). */
exports.listLabReferrals = async (req, res) => {
  try {
    const filter = {};
    if (req.query.laboratoryId && mongoose.Types.ObjectId.isValid(req.query.laboratoryId)) {
      filter.targetLaboratoryId = req.query.laboratoryId;
    }
    const referrals = await LabReferral.find(filter)
      .populate('targetLaboratoryId', 'labName')
      .populate({ path: 'consultantId', populate: { path: 'userId', select: 'name email phone' } })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('[ADMIN_LIST_LAB_REFERRALS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to list lab referrals' });
  }
};

/** Oversight: list lab payouts (optionally for a single lab via ?laboratoryId=). */
exports.listLabPayouts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.laboratoryId && mongoose.Types.ObjectId.isValid(req.query.laboratoryId)) {
      filter.laboratoryId = req.query.laboratoryId;
    }
    const payouts = await LabPayout.find(filter)
      .populate('laboratoryId', 'labName')
      .populate('labReferralId', 'referralCode patientName')
      .populate({ path: 'consultantId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(500);

    const accruedPaisa = payouts.filter((p) => p.status === 'accrued').reduce((s, p) => s + (p.amountPaisa || 0), 0);
    const paidPaisa = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amountPaisa || 0), 0);

    res.json({ success: true, data: payouts, summary: { accruedPaisa, paidPaisa, totalPaisa: accruedPaisa + paidPaisa } });
  } catch (error) {
    console.error('[ADMIN_LIST_LAB_PAYOUTS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to list lab payouts' });
  }
};

/** Admin edits a lab referral (oversight correction). */
exports.updateLabReferral = async (req, res) => {
  try {
    const referral = await LabReferral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Lab referral not found' });
    }

    const b = req.body;
    if (b.patientName != null && String(b.patientName).trim()) referral.patientName = String(b.patientName).trim();
    if (b.age != null && Number(b.age) >= 0) referral.age = Number(b.age);
    if (b.gender && ['male', 'female', 'other'].includes(b.gender)) referral.gender = b.gender;
    if (b.phone != null) referral.phone = String(b.phone).replace(/[\s\-()]/g, '');
    if (b.area != null) referral.area = String(b.area).trim();
    if (b.guardianName != null) referral.guardianName = String(b.guardianName).trim();
    if (b.guardianRelation && ['S/O', 'D/O', 'W/O'].includes(b.guardianRelation)) referral.guardianRelation = b.guardianRelation;
    if (b.urgency && ['emergency', 'urgent', 'routine'].includes(b.urgency)) referral.urgency = b.urgency;
    if (b.summaryNotes != null) referral.summaryNotes = String(b.summaryNotes).trim();
    if (b.symptomsText != null) referral.symptomsText = String(b.symptomsText).trim();
    if (b.notes != null) referral.notes = String(b.notes).trim();
    if (b.status && ['pending', 'accepted', 'reported', 'closed', 'rejected'].includes(b.status)) referral.status = b.status;
    if (b.rejectionReason != null) referral.rejectionReason = String(b.rejectionReason).trim();
    if (b.expectedReportAt) {
      const d = new Date(b.expectedReportAt);
      if (!isNaN(d.getTime())) referral.expectedReportAt = d;
    }
    if (Array.isArray(b.recommendedTests)) {
      referral.recommendedTests = b.recommendedTests
        .filter((t) => t && String(t.testName || '').trim())
        .map((t) => ({ testName: String(t.testName).trim(), note: String(t.note || '').trim() }));
    }
    if (b.discountPercentage != null) {
      referral.discountPercentage = Math.max(0, Math.min(100, Number(b.discountPercentage) || 0));
    }
    if (Array.isArray(b.services)) {
      referral.services = b.services
        .filter((s) => String(s.description || '').trim())
        .map((s) => ({ description: String(s.description).trim(), amountPaisa: Math.max(0, Number(s.amountPaisa) || 0) }));
    }
    // Recompute bill totals from current services + discount
    const gross = (referral.services || []).reduce((sum, s) => sum + (s.amountPaisa || 0), 0);
    const discountAmt = Math.round(gross * ((referral.discountPercentage || 0) / 100));
    referral.grossAmountPaisa = gross;
    referral.discountAmountPaisa = discountAmt;
    referral.billTotalPaisa = Math.max(0, gross - discountAmt);

    await referral.save();

    await logAction({
      actorId: req.user.id,
      action: 'ADMIN_LAB_REFERRAL_UPDATED',
      entityId: referral._id,
      entityModel: 'LabReferral',
      details: { referralCode: referral.referralCode },
    });

    res.json({ success: true, data: referral });
  } catch (error) {
    console.error('[ADMIN_UPDATE_LAB_REFERRAL_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to update lab referral' });
  }
};
