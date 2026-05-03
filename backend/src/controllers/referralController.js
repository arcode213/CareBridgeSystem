const mongoose = require('mongoose');
const Referral = require('../models/Referral');
const Hospital = require('../models/Hospital');
const Consultant = require('../models/Consultant');
const User = require('../models/User');
const Payout = require('../models/Payout');
const { scoreHospital } = require('../utils/scoringEngine');
const { slaDeadlineFromUrgency } = require('../utils/sla');
const { resolveDepartmentFromSymptoms } = require('../services/departmentService');
const { getScoringWeights } = require('../services/scoringWeightsService');
const suggestionCache = require('../utils/suggestionCache');

/** Only hospitals tied to an active hospital user (registration + admin approval). */
async function filterHospitalsEligibleForReferrals(hospitals) {
  if (!hospitals.length) return [];
  const userIds = hospitals.map((h) => h.userId);
  const activeOwners = await User.find({
    _id: { $in: userIds },
    role: 'hospital',
    status: 'active',
  }).select('_id');
  const allowed = new Set(activeOwners.map((u) => u._id.toString()));
  return hospitals.filter((h) => allowed.has(h.userId.toString()));
}

exports.getSuggestions = async (req, res) => {
  try {
    const rawSymptoms = req.query.symptoms;
    const symptoms = typeof rawSymptoms === 'string' ? rawSymptoms.trim() : '';
    const { urgency, budgetMax, lat, lng } = req.query;

    const consultant = await Consultant.findOne({ userId: req.user.id });
    const weights = await getScoringWeights();
    const detectedDept = await resolveDepartmentFromSymptoms(symptoms);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Valid lat and lng query parameters are required',
      });
    }

    const cacheKey = suggestionCache.makeKey({
      detectedDept,
      urgency: urgency || 'routine',
      budgetMax: parseInt(budgetMax, 10) || 10000000,
      lat: latNum,
      lng: lngNum,
      consultantId: consultant?._id?.toString() || '',
      weights,
    });
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const hospitals = await Hospital.find({
      departments: detectedDept,
      isActive: true,
    });

    const eligibleHospitals = await filterHospitalsEligibleForReferrals(hospitals);

    const referralData = {
      department: detectedDept,
      urgency: urgency || 'routine',
      budgetMax: parseInt(budgetMax, 10) || 10000000,
      location: { lat: latNum, lng: lngNum },
    };

    const suggestions = eligibleHospitals
      .map((h) => scoreHospital(h, referralData, consultant, weights))
      .filter((s) => s !== null)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    const payload = {
      success: true,
      detectedDept,
      suggestions,
    };
    suggestionCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, message: 'Error generating suggestions' });
  }
};

async function ensureConsultantPromoCode(consultant) {
  if (consultant.promoCode) {
    return consultant.promoCode;
  }
  const base = String(consultant.pmdcNumber || consultant._id).replace(/\s+/g, '').slice(-12);
  const promoCode = `PR-${base.toUpperCase()}`;
  consultant.promoCode = promoCode;
  await consultant.save();
  return promoCode;
}

exports.createReferral = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user.id });
    if (!consultant) {
      return res.status(404).json({ success: false, message: 'Consultant profile not found' });
    }

    const targetHospitalId = req.body.targetHospitalId;
    if (!targetHospitalId || !mongoose.Types.ObjectId.isValid(targetHospitalId)) {
      return res.status(400).json({ success: false, message: 'Valid target hospital is required' });
    }

    const targetHospital = await Hospital.findById(targetHospitalId);
    if (!targetHospital || !targetHospital.isActive) {
      return res.status(400).json({ success: false, message: 'Hospital is not available for referrals' });
    }
    const targetOwner = await User.findOne({
      _id: targetHospital.userId,
      role: 'hospital',
      status: 'active',
    });
    if (!targetOwner) {
      return res.status(400).json({ success: false, message: 'Hospital is not available for referrals' });
    }

    const urgency = req.body.urgency || 'routine';
    if (!['emergency', 'urgent', 'routine'].includes(urgency)) {
      return res.status(400).json({ success: false, message: 'Invalid urgency' });
    }

    const promoCode = await ensureConsultantPromoCode(consultant);

    let ranked = (req.body.rankedHospitalIds || [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const seenIds = new Set();
    ranked = ranked.filter((id) => {
      const s = id.toString();
      if (seenIds.has(s)) return false;
      seenIds.add(s);
      return true;
    });
    if (ranked.length > 5) {
      return res.status(400).json({ success: false, message: 'At most 5 ranked hospitals allowed' });
    }
    const targetOid = new mongoose.Types.ObjectId(targetHospitalId);
    if (ranked.length === 0) {
      ranked = [targetOid];
    }
    const rankIdx = ranked.findIndex((id) => id.equals(targetOid));
    if (rankIdx === -1) {
      return res.status(400).json({
        success: false,
        message: 'Selected hospital must be included in the ranked hospital list',
      });
    }

    const rankedHospitalDocs = await Hospital.find({ _id: { $in: ranked }, isActive: true });
    if (rankedHospitalDocs.length !== ranked.length) {
      return res.status(400).json({ success: false, message: 'One or more ranked hospitals are invalid or inactive' });
    }
    const rankedEligible = await filterHospitalsEligibleForReferrals(rankedHospitalDocs);
    if (rankedEligible.length !== rankedHospitalDocs.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more ranked hospitals are not approved referral facilities',
      });
    }

    const referral = new Referral({
      consultantId: consultant._id,
      rankedHospitalIds: ranked,
      currentRankIndex: rankIdx,
      patientName: req.body.patientName,
      age: Number(req.body.age),
      gender: req.body.gender,
      phone: req.body.phone,
      area: req.body.area,
      cnic: req.body.cnic,
      urgency,
      symptomsText: req.body.symptoms ?? req.body.symptomsText,
      symptomTags: req.body.symptomTags,
      department: req.body.department,
      diagnosisText: req.body.diagnosisText,
      notes: req.body.notes,
      attachments: req.body.attachments,
      budgetMin: req.body.budgetMin != null ? Number(req.body.budgetMin) : undefined,
      budgetMax: req.body.budgetMax != null ? Number(req.body.budgetMax) : undefined,
      targetHospitalId,
      scoringData: req.body.scoringData,
      promoCode,
      slaDeadline: slaDeadlineFromUrgency(urgency),
      status: 'pending',
    });

    await referral.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital:${targetHospitalId}`).emit('NEW_REFERRAL', {
        hospitalId: String(targetHospitalId),
        referralId: referral._id.toString(),
      });
      io.to(`consultant:${consultant._id.toString()}`).emit('NEW_REFERRAL', {
        referralId: referral._id.toString(),
        hospitalId: String(targetHospitalId),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Referral submitted successfully',
      data: referral,
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ success: false, message: 'Error submitting referral' });
  }
};

exports.getMyReferrals = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user.id });
    if (!consultant) {
      return res.status(404).json({ success: false, message: 'Consultant profile not found' });
    }
    const referrals = await Referral.find({ consultantId: consultant._id })
      .populate('targetHospitalId', 'hospitalName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching referrals' });
  }
};

exports.getHospitalInbox = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const referrals = await Referral.find({
      targetHospitalId: hospital._id,
      status: 'pending',
    })
      .populate({
        path: 'consultantId',
        select: 'userId pmdcNumber specialty',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    console.error('Hospital inbox error:', error);
    res.status(500).json({ success: false, message: 'Error fetching hospital inbox' });
  }
};

exports.getReferralDetails = async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('targetHospitalId', 'hospitalName location')
      .populate({
        path: 'consultantId',
        select: 'userId pmdcNumber',
        populate: { path: 'userId', select: 'name email phone' },
      });

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    const consultant = await Consultant.findOne({ userId: req.user.id });
    const hospital = await Hospital.findOne({ userId: req.user.id });

    const referralConsultantId = referral.consultantId?._id
      ? referral.consultantId._id.toString()
      : referral.consultantId.toString();
    const referralHospitalId = referral.targetHospitalId?._id
      ? referral.targetHospitalId._id.toString()
      : referral.targetHospitalId?.toString();

    if (req.user.role === 'consultant') {
      if (!consultant || referralConsultantId !== consultant._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    } else if (req.user.role === 'hospital') {
      if (!hospital || !referralHospitalId || referralHospitalId !== hospital._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    res.json({
      success: true,
      data: referral,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching referral details' });
  }
};

exports.updateReferralStatus = async (req, res) => {
  try {
    const { status, reason, assignedDepartment } = req.body;
    const allowed = ['accepted', 'rejected', 'admitted', 'closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const hospital = await Hospital.findOne({ userId: req.user.id });

    const referral = await Referral.findOne({
      _id: req.params.id,
      targetHospitalId: hospital._id,
    });

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found or unauthorized' });
    }

    if (status === 'rejected') {
      const r = reason != null ? String(reason).trim() : '';
      if (!r) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }
      referral.rejectionReason = r;
    }

    referral.status = status;
    const now = new Date();
    if (status === 'accepted') {
      referral.acceptedAt = now;
      if (assignedDepartment != null && String(assignedDepartment).trim()) {
        referral.assignedDepartment = String(assignedDepartment).trim();
      }
    }
    if (status === 'admitted') {
      referral.admittedAt = now;
    }
    if (status === 'closed') {
      referral.closedAt = now;
    }

    await referral.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital:${hospital._id.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status,
      });
      io.to(`consultant:${referral.consultantId.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status,
      });
    }

    res.json({
      success: true,
      message: `Referral ${status} successfully`,
      data: referral,
    });
  } catch (error) {
    console.error('Update referral status error:', error);
    res.status(500).json({ success: false, message: 'Error updating referral status' });
  }
};

exports.getConsultantEarnings = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user.id });
    if (!consultant) {
      return res.status(404).json({ success: false, message: 'Consultant profile not found' });
    }

    const referrals = await Referral.find({
      consultantId: consultant._id,
      status: { $in: ['accepted', 'admitted', 'closed'] },
    }).sort({ createdAt: -1 });

    const payouts = await Payout.find({ consultantId: consultant._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('referralId', 'referralCode')
      .lean();

    res.json({
      success: true,
      data: {
        totalEarningsPaisa: consultant.totalEarnings || 0,
        monthlyEarningsPaisa: consultant.monthlyEarnings || 0,
        referralCount: referrals.length,
        referrals,
        payouts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching earnings' });
  }
};
