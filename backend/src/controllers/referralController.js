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
const { logAction } = require('../utils/logger');
const { updateHospitalStats } = require('../services/statsService');
const HospitalDoctor = require('../models/HospitalDoctor');
const { sendEmail } = require('../utils/emailService');

exports.getHospitalDoctors = async (req, res) => {
  try {
    const { id } = req.params;
    const doctors = await HospitalDoctor.find({ hospitalId: id, isAvailable: true }).select('name specialty consultationFee');
    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching doctors' });
  }
};

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
      .slice(0, 10);

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
    const { patientName, cnic, guardianName, guardianCnic, phone } = req.body;
    if (!patientName) {
      return res.status(400).json({ success: false, message: 'Patient Name is required' });
    }
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnic || !cnicRegex.test(cnic)) {
      return res.status(400).json({ success: false, message: 'Patient CNIC must be in the format XXXXX-XXXXXXX-X' });
    }
    if (!guardianName) {
      return res.status(400).json({ success: false, message: 'Guardian Name is required' });
    }
    if (!guardianCnic || !cnicRegex.test(guardianCnic)) {
      return res.status(400).json({ success: false, message: 'Guardian CNIC must be in the format XXXXX-XXXXXXX-X' });
    }
    const phoneClean = phone ? phone.replace(/[\s\-()]/g, '') : '';
    const phoneRegex = /^((\+92)|(0092)|0)?3\d{9}$/;
    if (!phoneRegex.test(phoneClean)) {
      return res.status(400).json({ success: false, message: 'Phone number must be a valid Pakistani mobile number' });
    }
    req.body.phone = phoneClean; // use sanitized phone number

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
    if (ranked.length > 10) {
      return res.status(400).json({ success: false, message: 'At most 10 ranked hospitals allowed' });
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
      guardianName: req.body.guardianName,
      guardianCnic: req.body.guardianCnic,
      urgency,
      symptomsText: req.body.symptoms ?? req.body.symptomsText,
      summaryNotes: req.body.summaryNotes,
      symptomTags: req.body.symptomTags,
      department: req.body.department,
      diagnosisText: req.body.diagnosisText,
      notes: req.body.notes,
      attachments: req.body.attachments,
      budgetMin: req.body.budgetMin != null ? Number(req.body.budgetMin) : undefined,
      budgetMax: req.body.budgetMax != null ? Number(req.body.budgetMax) : undefined,
      budgetBracket: req.body.budgetBracket,
      targetHospitalId,
      targetDoctorId: (req.body.targetDoctorId && mongoose.Types.ObjectId.isValid(req.body.targetDoctorId)) ? req.body.targetDoctorId : undefined,
      scoringData: req.body.scoringData,
      promoCode,
      slaDeadline: slaDeadlineFromUrgency(urgency),
      status: 'pending',
    });

    await referral.save();

    await logAction({
      req,
      action: 'REFERRAL_CREATED',
      entityId: referral._id,
      entityModel: 'Referral',
      details: { targetHospitalId, urgency }
    });

    // 1. Send confirmation email to Consultant (async)
    try {
      sendEmail({
        to: req.user.email,
        subject: `CareBridge: Referral Submitted - ${referral.referralCode}`,
        text: `Hello Dr. ${req.user.name},\n\nYour referral for patient ${referral.patientName} has been successfully submitted to ${targetHospital.hospitalName} with ${urgency} urgency.\n\nReferral Code: ${referral.referralCode}\n\nYou will be notified as soon as the hospital reviews and updates the status.`,
      });
    } catch (err) {
      console.error('Consultant referral email notification failed:', err.message);
    }

    // 2. Send alert email to Target Hospital (async)
    try {
      sendEmail({
        to: targetOwner.email,
        subject: `CareBridge: New Referral Received - ${referral.referralCode}`,
        text: `Hello ${targetHospital.hospitalName},\n\nA new referral has been routed to your facility with ${urgency} urgency.\n\nPatient Name: ${referral.patientName}\nReferral Code: ${referral.referralCode}\n\nPlease log in to your dashboard to review this case and update its status within the SLA deadline.`,
      });
    } catch (err) {
      console.error('Hospital new referral email notification failed:', err.message);
    }

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
      .populate('targetDoctorId', 'name specialty')
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
      .populate('targetDoctorId', 'name specialty')
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

exports.getHospitalReferrals = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const referrals = await Referral.find({
      targetHospitalId: hospital._id,
    })
      .populate('targetDoctorId', 'name specialty')
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
    console.error('Hospital referrals error:', error);
    res.status(500).json({ success: false, message: 'Error fetching hospital referrals' });
  }
};

exports.getReferralDetails = async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('targetHospitalId', 'hospitalName location')
      .populate('targetDoctorId', 'name specialty pmdcNumber')
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
    }).populate({
      path: 'consultantId',
      populate: { path: 'userId' }
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

    const oldStatus = referral.status;
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
      // Trigger payout logic (Q14)
      const { creditConsultantWallet } = require('../services/paymentService');
      await creditConsultantWallet(referral.consultantId, referral._id, 100000);
    }

    await referral.save();

    // Send email notifications (async)
    const consultantUser = referral.consultantId?.userId;
    if (consultantUser) {
      try {
        sendEmail({
          to: consultantUser.email,
          subject: `CareBridge: Referral Status Updated to ${status.toUpperCase()} - ${referral.referralCode}`,
          text: `Hello Dr. ${consultantUser.name},\n\nThe status of your referral for patient ${referral.patientName} (${referral.referralCode}) has been updated by ${hospital.hospitalName}.\n\nNew Status: ${status.toUpperCase()}\n${status === 'rejected' ? `Rejection Reason: ${referral.rejectionReason}\n` : ''}\nPlease log in to your dashboard for details.`,
        });
      } catch (err) {
        console.error('Consultant status email notification failed:', err.message);
      }
    }

    try {
      sendEmail({
        to: req.user.email,
        subject: `CareBridge: Status Confirmed for Referral ${referral.referralCode}`,
        text: `Hello ${hospital.hospitalName},\n\nYou have successfully updated the status of referral ${referral.referralCode} to ${status.toUpperCase()}.\n\nPatient Name: ${referral.patientName}\n\nThank you for ensuring timely clinical routing.`,
      });
    } catch (err) {
      console.error('Hospital status email notification failed:', err.message);
    }

    // Recalculate hospital performance metrics (Factor 5: SLA History)
    if (['accepted', 'rejected'].includes(status)) {
      await updateHospitalStats(hospital._id);
    }

    await logAction({
      req,
      action: 'REFERRAL_STATUS_CHANGE',
      entityId: referral._id,
      entityModel: 'Referral',
      details: { oldStatus, newStatus: status, reason }
    });

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

    const payouts = await Payout.find({ consultantId: consultant._id }, {
      deductionPercentage: 0,
      platformCutPaisa: 0,
      adminSharePaisa: 0,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('referralId', 'referralCode patientName urgency department')
      .lean();

    res.json({
      success: true,
      data: {
        consultant: await Consultant.findById(consultant._id).populate('userId', 'name email phone'),
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
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const { amountPaisa, paymentMethod, mobileNumber } = req.body;
    const consultant = await Consultant.findOne({ userId: req.user.id });

    if (!consultant) {
      return res.status(404).json({ success: false, message: 'Consultant not found' });
    }

    if (!amountPaisa || amountPaisa < 50000) { // Min 500 PKR
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is 500 PKR' });
    }

    if (consultant.totalEarnings < amountPaisa) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Since we don't have a WithdrawalRequest model yet, I'll log it and update Payouts status
    // For now, I'll create a Payout record with status 'pending_withdrawal'
    const withdrawal = await Payout.create({
      consultantId: consultant._id,
      amountPaisa: -amountPaisa, // Negative to reflect withdrawal in history
      status: 'pending',
      note: `Withdrawal request via ${paymentMethod} (${mobileNumber})`,
    });

    // Deduct from consultant's total earnings
    consultant.totalEarnings -= amountPaisa;
    await consultant.save();

    await logAction({
      req,
      action: 'WITHDRAWAL_REQUESTED',
      entityId: withdrawal._id,
      entityModel: 'Payout',
      details: { amountPaisa, paymentMethod, mobileNumber }
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: withdrawal
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to process withdrawal' });
  }
};
exports.addClinicalNote = async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content || !type) {
      return res.status(400).json({ success: false, message: 'Content and type are required' });
    }

    const referral = await Referral.findById(req.params.id)
      .populate({ path: 'consultantId', populate: { path: 'userId' } })
      .populate({ path: 'targetHospitalId', populate: { path: 'userId' } });
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    // Authorization check: Only assigned hospital or the referring consultant can add notes
    const consultant = await Consultant.findOne({ userId: req.user.id });
    const hospital = await Hospital.findOne({ userId: req.user.id });

    const isConsultant = consultant && referral.consultantId && referral.consultantId._id.toString() === consultant._id.toString();
    const isHospital = hospital && referral.targetHospitalId && referral.targetHospitalId._id.toString() === hospital._id.toString();

    if (!isConsultant && !isHospital) {
      return res.status(403).json({ success: false, message: 'Unauthorized to add notes to this referral' });
    }

    referral.clinicalNotes.push({
      type,
      content,
      author: req.user.id,
      authorName: req.user.name,
      createdAt: new Date()
    });

    await referral.save();

    // Send email notifications to the other party (async)
    if (isHospital) {
      const consultantUser = referral.consultantId?.userId;
      if (consultantUser) {
        try {
          sendEmail({
            to: consultantUser.email,
            subject: `CareBridge: New Clinical Note for Patient ${referral.patientName}`,
            text: `Hello Dr. ${consultantUser.name},\n\n${req.user.name} added a new clinical note to the referral for patient ${referral.patientName} (${referral.referralCode}).\n\nContent:\n"${content}"\n\nPlease log in to review this note and reply.`,
          });
        } catch (err) {
          console.error('Clinical note email notification failed:', err.message);
        }
      }
    } else if (isConsultant) {
      const hospitalUser = referral.targetHospitalId?.userId;
      if (hospitalUser) {
        try {
          sendEmail({
            to: hospitalUser.email,
            subject: `CareBridge: New Clinical Note for Patient ${referral.patientName}`,
            text: `Hello ${referral.targetHospitalId?.hospitalName || 'Clinical Staff'},\n\nDr. ${req.user.name} added a new clinical note to the referral for patient ${referral.patientName} (${referral.referralCode}).\n\nContent:\n"${content}"\n\nPlease log in to review this note and update the patient's care status.`,
          });
        } catch (err) {
          console.error('Clinical note email notification failed:', err.message);
        }
      }
    }

    // Notify other party via socket
    const io = req.app.get('io');
    if (io) {
      const room = isHospital ? `consultant:${referral.consultantId._id.toString()}` : `hospital:${referral.targetHospitalId._id.toString()}`;
      io.to(room).emit('NEW_CLINICAL_NOTE', {
        referralId: referral._id,
        type,
        authorName: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Note added successfully',
      data: referral.clinicalNotes[referral.clinicalNotes.length - 1]
    });
  } catch (error) {
    console.error('Add clinical note error:', error);
    res.status(500).json({ success: false, message: 'Error adding clinical note' });
  }
};
