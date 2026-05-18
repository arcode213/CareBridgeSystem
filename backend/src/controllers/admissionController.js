const Admission = require('../models/Admission');
const Referral = require('../models/Referral');
const Hospital = require('../models/Hospital');
const Consultant = require('../models/Consultant');
const Payout = require('../models/Payout');
const PlatformSettings = require('../models/PlatformSettings');

exports.listAdmissions = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }
    const rows = await Admission.find({ hospitalId: hospital._id })
      .populate('referralId', 'referralCode patientName urgency status department')
      .populate('consultantId', 'pmdcNumber')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to list admissions' });
  }
};

/** Start admission for an accepted referral (marks referral admitted). */
exports.createAdmission = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }
    const { referralId } = req.body;
    if (!referralId) {
      return res.status(400).json({ success: false, message: 'referralId required' });
    }

    const referral = await Referral.findOne({
      _id: referralId,
      targetHospitalId: hospital._id,
      status: 'accepted',
    });
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found or must be accepted first',
      });
    }

    const existing = await Admission.findOne({ referralId: referral._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admission already exists for this referral' });
    }

    const admission = await Admission.create({
      referralId: referral._id,
      hospitalId: hospital._id,
      consultantId: referral.consultantId,
      status: 'active',
      admitDate: new Date(),
    });

    referral.status = 'admitted';
    referral.admittedAt = new Date();
    await referral.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital:${hospital._id.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status: 'admitted',
      });
      io.to(`consultant:${referral.consultantId.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status: 'admitted',
      });
    }

    res.status(201).json({ success: true, data: admission });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to create admission' });
  }
};

exports.updateAdmission = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const admission = await Admission.findOne({
      _id: req.params.id,
      hospitalId: hospital._id,
    });
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    if (admission.status === 'billed') {
      return res.status(400).json({ success: false, message: 'Admission is already finalized' });
    }

    const { services, billTotalPaisa, paymentMethod, paymentReference, notes, dischargeDate, status } = req.body;

    if (Array.isArray(services)) {
      admission.services = services.map((s) => ({
        description: String(s.description || '').trim(),
        amountPaisa: Math.max(0, Number(s.amountPaisa) || 0),
      }));
    }
    if (billTotalPaisa != null) admission.billTotalPaisa = Math.max(0, Number(billTotalPaisa));
    if (paymentMethod) admission.paymentMethod = paymentMethod;
    if (paymentReference != null) admission.paymentReference = String(paymentReference).trim();
    if (notes != null) admission.notes = String(notes).trim();
    if (dischargeDate) admission.dischargeDate = new Date(dischargeDate);
    if (status === 'discharged') admission.status = 'discharged';

    await admission.save();
    res.json({ success: true, data: admission });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to update admission' });
  }
};

const billingService = require('../services/billingService');

/** Finalize billing: closes referral, accrues consultant payout (SRS §12.2). */
exports.completeAdmission = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const admission = await Admission.findOne({
      _id: req.params.id,
      hospitalId: hospital._id,
    });

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    if (admission.status === 'billed') {
      return res.status(400).json({ success: false, message: 'Already completed' });
    }

    const bill = admission.billTotalPaisa != null ? Number(admission.billTotalPaisa) : 0;
    if (bill <= 0) {
      return res.status(400).json({ success: false, message: 'Set bill total (PKR as paisa) before completing' });
    }

    const pm = admission.paymentMethod || 'pending';
    if (pm === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Select payment method (cash, jazzcash, easypaisa, bank_transfer)',
      });
    }

    const io = req.app.get('io');
    const finalized = await billingService.finalizeAdmission(
      admission._id,
      pm,
      admission.paymentReference,
      io
    );

    res.json({
      success: true,
      message: 'Admission completed; consultant payout accrued',
      data: finalized,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to complete admission' });
  }
};
