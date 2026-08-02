const LabSettlement = require('../models/LabSettlement');
const { getLabForUser } = require('../utils/resolveOrg');
const LabReferral = require('../models/LabReferral');
const LabPayout = require('../models/LabPayout');
const Laboratory = require('../models/Laboratory');
const Consultant = require('../models/Consultant');
const User = require('../models/User');
const { logAction } = require('../utils/logger');
const notificationService = require('../services/notificationService');

// 1. Lab lists referrals eligible for weekly settlement (closed and not settled)
exports.listPendingReferrals = async (req, res) => {
  try {
    const lab = await getLabForUser(req.user);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const PlatformSettings = require('../models/PlatformSettings');
    const commissionService = require('../services/commissionService');
    const settings = await PlatformSettings.findOne().sort({ updatedAt: -1 });

    const referrals = await LabReferral.find({
      targetLaboratoryId: lab._id,
      status: 'closed',
      weeklySettlementId: null,
    })
      .populate({ path: 'consultantId', populate: { path: 'userId', select: 'name email' } })
      .sort({ completedAt: -1 });

    // Read the immutable LabPayout snapshot so the preview == the final settled amount.
    const payouts = await LabPayout.find({ labReferralId: { $in: referrals.map((r) => r._id) } });
    const snapByReferral = {};
    for (const p of payouts) {
      if (!p.labReferralId) continue;
      snapByReferral[p.labReferralId.toString()] = p;
    }

    const results = referrals.map((ref) => {
      const doc = ref.toObject();
      const snap = snapByReferral[ref._id.toString()];
      
      const currentSplit = commissionService.computeLabSplit({
        tests: doc.services || [],
        discountPercentage: doc.discountPercentage || 0,
        consultant: doc.consultantId,
        lab,
        settings,
      });

      doc.platformChargePaisa = currentSplit.platformChargePaisa;
      doc.doctorCommissionPaisa = currentSplit.doctorCommissionPaisa;
      doc.totalCutPaisa = currentSplit.totalCutPaisa;
      doc.calculatedPlatformCutPaisa = currentSplit.platformCutPaisa;
      return doc;
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[LIST_PENDING_LAB_REFERRALS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending referrals' });
  }
};

// 2. Lab creates a weekly settlement and uploads its payment receipt in one step.
//    The selected referrals' individual bills (patientBillFileUrl) are auto-attached
//    via labReferralIds — no separate weekly bill summary is collected.
exports.createSettlement = async (req, res) => {
  try {
    const { billingPeriodStart, billingPeriodEnd, labReferralIds, labReceiptFileUrl, notes } = req.body;

    if (!billingPeriodStart || !billingPeriodEnd || !labReferralIds || !labReferralIds.length || !labReceiptFileUrl) {
      return res.status(400).json({ success: false, message: 'Missing required settlement parameters' });
    }

    const lab = await getLabForUser(req.user);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const PlatformSettings = require('../models/PlatformSettings');
    const commissionService = require('../services/commissionService');
    const settings = await PlatformSettings.findOne().sort({ updatedAt: -1 });

    // 1. Verify referrals are eligible and populate consultantId
    const referrals = await LabReferral.find({
      _id: { $in: labReferralIds },
      targetLaboratoryId: lab._id,
      status: 'closed',
      weeklySettlementId: null,
    }).populate('consultantId');

    if (referrals.length !== labReferralIds.length) {
      return res.status(400).json({ success: false, message: 'Some selected referrals are invalid or already settled' });
    }

    // 2. Load accrued payouts for these referrals to extract precise splits
    const payouts = await LabPayout.find({
      labReferralId: { $in: labReferralIds },
      status: 'accrued',
      weeklySettlementId: null,
    });

    const grossAmountPaisa = referrals.reduce((sum, r) => sum + (r.billTotalPaisa || 0), 0);
    
    let facilityTotalPayablePaisa = 0;

    for (const referral of referrals) {
      const currentSplit = commissionService.computeLabSplit({
        tests: referral.services || [],
        discountPercentage: referral.discountPercentage || 0,
        consultant: referral.consultantId,
        lab,
        settings,
      });

      facilityTotalPayablePaisa += currentSplit.platformCutPaisa;
    }
    
    const calculatedPlatformCutPaisa = facilityTotalPayablePaisa;

    // 5. Create settlement record
    const settlement = await LabSettlement.create({
      laboratoryId: lab._id,
      billingPeriodStart: new Date(billingPeriodStart),
      billingPeriodEnd: new Date(billingPeriodEnd),
      labReferralIds,
      grossAmountPaisa,
      deductionPercentage: lab.deductionPercentage || 20,
      calculatedPlatformCutPaisa,
      facilityTotalPayablePaisa,
      labReceiptFileUrl,
      labPaidAt: new Date(),
      notes,
      status: 'pending_admin_verification',
      consultantPayouts: [],
    });

    // 6. Link referrals to this settlement
    await LabReferral.updateMany({ _id: { $in: labReferralIds } }, { $set: { weeklySettlementId: settlement._id } });

    // 7. Audit log
    await logAction({
      actorId: req.user.id,
      action: 'LAB_SETTLEMENT_CREATED',
      entityId: settlement._id,
      entityModel: 'LabSettlement',
      details: { grossAmountPaisa, calculatedPlatformCutPaisa },
    });

    notificationService
      .notifyAllAdmins('LAB_SETTLEMENT_CREATED', `New weekly lab settlement submitted by ${lab.labName}`, {
        labName: lab.labName,
        grossAmount: (grossAmountPaisa / 100).toFixed(2),
        platformCut: (calculatedPlatformCutPaisa / 100).toFixed(2),
      })
      .catch((err) => console.error('Lab settlement created notify failed:', err.message));

    res.status(201).json({ success: true, message: 'Settlement submitted with payment receipt — awaiting admin verification', data: settlement });
  } catch (error) {
    console.error('[CREATE_LAB_SETTLEMENT_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to create weekly lab settlement summary' });
  }
};

// 3. Lab uploads proof of manual transfer receipt
exports.uploadLabReceipt = async (req, res) => {
  try {
    const { labReceiptFileUrl } = req.body;
    const { id } = req.params;

    if (!labReceiptFileUrl) {
      return res.status(400).json({ success: false, message: 'Receipt URL is required' });
    }

    const lab = await getLabForUser(req.user);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const settlement = await LabSettlement.findOne({ _id: id, laboratoryId: lab._id });
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Lab settlement not found' });
    }

    if (settlement.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'Settlement is not in pending payment state' });
    }

    settlement.labReceiptFileUrl = labReceiptFileUrl;
    settlement.labPaidAt = new Date();
    settlement.status = 'pending_admin_verification';
    settlement.rejectionReason = null;
    await settlement.save();

    await logAction({
      actorId: req.user.id,
      action: 'LAB_RECEIPT_UPLOADED',
      entityId: settlement._id,
      entityModel: 'LabSettlement',
      details: { labReceiptFileUrl },
    });

    notificationService
      .notifyAllAdmins('LAB_RECEIPT_UPLOADED', `${lab.labName} uploaded a payment receipt for verification`, {
        labName: lab.labName,
      })
      .catch((err) => console.error('Lab receipt uploaded notify failed:', err.message));

    res.json({ success: true, message: 'Payment receipt uploaded successfully', data: settlement });
  } catch (error) {
    console.error('[UPLOAD_LAB_RECEIPT_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to upload receipt' });
  }
};

// 4. Lab lists its settlements
exports.listLabSettlements = async (req, res) => {
  try {
    const lab = await getLabForUser(req.user);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const settlements = await LabSettlement.find({ laboratoryId: lab._id })
      .populate('labReferralIds', 'referralCode billTotalPaisa status completedAt patientBillFileUrl')
      .populate({ path: 'consultantPayouts.consultantId', populate: { path: 'userId', select: 'name payoutAccount' } })
      .sort({ createdAt: -1 });

    // Hide consultant payout amounts from the lab (they only owe the platform cut)
    const results = settlements.map((s) => {
      const doc = s.toObject();
      if (doc.consultantPayouts) {
        doc.consultantPayouts = doc.consultantPayouts.map((p) => {
          delete p.amountPaisa;
          delete p.commissionPercentage;
          delete p.commissionType;
          delete p.fixedCommissionPaisa;
          return p;
        });
      }
      return doc;
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[LIST_LAB_SETTLEMENTS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to list settlements' });
  }
};

// 5. Admin lists all lab settlements in the manual approval queue
exports.adminListSettlements = async (req, res) => {
  try {
    const settlements = await LabSettlement.find()
      .populate('laboratoryId', 'labName deductionPercentage')
      .populate('labReferralIds', 'billTotalPaisa completedAt patientBillFileUrl referralCode')
      .populate({ path: 'consultantPayouts.consultantId', populate: { path: 'userId', select: 'name payoutAccount' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: settlements });
  } catch (error) {
    console.error('[ADMIN_LIST_LAB_SETTLEMENTS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settlements' });
  }
};

// 6. Admin verifies or rejects the lab receipt
exports.adminVerifyLabReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const settlement = await LabSettlement.findById(id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (!['pending_admin_verification', 'pending_payment'].includes(settlement.status)) {
      return res.status(400).json({ success: false, message: 'Settlement is not in a verifiable state' });
    }

    if (action === 'approve') {
      settlement.status = 'completed';
      settlement.adminVerifiedAt = new Date();
      settlement.adminVerifierId = req.user.id;
    } else {
      if (!rejectionReason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }
      settlement.status = 'pending_payment';
      settlement.rejectionReason = rejectionReason;
      settlement.labReceiptFileUrl = null;
    }

    await settlement.save();

    await logAction({
      actorId: req.user.id,
      action: action === 'approve' ? 'ADMIN_LAB_SETTLEMENT_APPROVED' : 'ADMIN_LAB_SETTLEMENT_REJECTED',
      entityId: settlement._id,
      entityModel: 'LabSettlement',
      details: { rejectionReason },
    });

    const lab = await Laboratory.findById(settlement.laboratoryId);
    const labUser = lab ? await User.findOne({ _id: lab.userId, role: 'laboratory' }) : null;
    if (labUser) {
      const type = action === 'approve' ? 'SETTLEMENT_VERIFIED' : 'SETTLEMENT_REJECTED';
      const message =
        action === 'approve'
          ? 'Your lab payment receipt has been verified.'
          : `Your lab payment receipt was rejected: ${rejectionReason}`;
      notificationService
        .sendAlert({
          userId: labUser._id,
          role: 'laboratory',
          type,
          message,
          data: { email: labUser.email, phone: labUser.phone, name: labUser.name, reason: rejectionReason },
        })
        .catch((err) => console.error('Lab settlement verify notify failed:', err.message));
    }

    res.json({ success: true, message: `Settlement successfully ${action}d`, data: settlement });
  } catch (error) {
    console.error('[ADMIN_VERIFY_LAB_SETTLEMENT_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to process verification' });
  }
};

