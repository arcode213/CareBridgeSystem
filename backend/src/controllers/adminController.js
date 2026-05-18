const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Hospital = require('../models/Hospital');
const Referral = require('../models/Referral');
const Admission = require('../models/Admission');
const Payout = require('../models/Payout');
const DepartmentCatalog = require('../models/DepartmentCatalog');
const ScoringConfig = require('../models/ScoringConfig');
const PlatformSettings = require('../models/PlatformSettings');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../utils/logger');

exports.listPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-passwordHash').sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      users.map(async (u) => {
        const base = { ...u };
        if (u.role === 'consultant') {
          base.profile = await Consultant.findOne({ userId: u._id }).select('pmdcNumber specialty clinicName clinicAddress verificationDocuments').lean();
        } else if (u.role === 'hospital') {
          base.profile = await Hospital.findOne({ userId: u._id })
            .select('hospitalName registrationNumber departments bedsInventory address registrationDocuments')
            .lean();
        }
        return base;
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('listPendingUsers:', error);
    res.status(500).json({ success: false, message: 'Failed to list pending users' });
  }
};

exports.listAllUsers = async (req, res) => {
  console.log(`[ADMIN] listAllUsers hit: role=${req.query.role}, status=${req.query.status}`);
  try {
    const filter = { status: { $ne: 'pending' } };
    if (req.query.role) filter.role = req.query.role;
    console.log('[ADMIN] Filter:', filter);
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
    console.log(`[ADMIN] Found ${users.length} users`);

    const enriched = await Promise.all(
      users.map(async (u) => {
        const base = { ...u };
        if (u.role === 'consultant') {
          base.profile = await Consultant.findOne({ userId: u._id })
            .select('pmdcNumber specialty clinicName clinicAddress totalEarnings monthlyEarnings walletBalance commissionPercentage promoCode isVerified preferredHospitals verificationDocuments')
            .lean();
        } else if (u.role === 'hospital') {
          base.profile = await Hospital.findOne({ userId: u._id })
            .select('hospitalName registrationNumber departments bedsInventory address city area deductionPercentage isActive registrationDocuments')
            .lean();
        }
        return base;
      })
    );

    console.log(`[ADMIN] Returning ${enriched.length} enriched users`);
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[ADMIN] listAllUsers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to list users', details: error.message });
  }
};


exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or suspended' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    if (user.role === 'hospital') {
      await Hospital.updateOne({ userId: user._id }, { isActive: status === 'active' });
    }
    if (user.role === 'consultant' && status === 'active') {
      await Consultant.updateOne({ userId: user._id }, { isVerified: true });
    }

    await logAction({
      req,
      action: 'USER_STATUS_CHANGE',
      entityId: user._id,
      entityModel: 'User',
      details: { role: user.role, newStatus: status }
    });

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'approved' : 'updated'}`,
      data: { id: user._id, status: user.status, role: user.role },
    });
  } catch (error) {
    console.error('updateUserStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [users, referrals, hospitals, admissions] = await Promise.all([
      User.countDocuments(),
      Referral.countDocuments(),
      Hospital.countDocuments({ isActive: true }),
      Admission.countDocuments({ status: 'billed' }),
    ]);
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const revenueAgg = await Admission.aggregate([
      { $match: { status: 'billed' } },
      { $group: { _id: null, total: { $sum: '$billTotalPaisa' } } },
    ]);
    const platformRevenuePaisa = revenueAgg[0]?.total || 0;

    const byHospital = await Referral.aggregate([
      { $match: { targetHospitalId: { $ne: null } } },
      { $group: { _id: '$targetHospitalId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const hospitalIds = byHospital.map((h) => h._id);
    const hospitalDocs = await Hospital.find({ _id: { $in: hospitalIds } }).select('hospitalName').lean();
    const nameById = Object.fromEntries(hospitalDocs.map((h) => [h._id.toString(), h.hospitalName]));
    const topHospitals = byHospital.map((row) => ({
      hospitalId: row._id,
      name: nameById[row._id.toString()] || 'Hospital',
      referrals: row.count,
    }));

    res.json({
      success: true,
      data: {
        totalUsers: users,
        pendingApprovals: pendingUsers,
        totalReferrals: referrals,
        activeHospitals: hospitals,
        completedAdmissions: admissions,
        platformRevenuePaisa,
        topHospitals,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Analytics failed' });
  }
};

exports.getScoringConfig = async (req, res) => {
  try {
    let doc = await ScoringConfig.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = await ScoringConfig.create({});
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load scoring config' });
  }
};

exports.updateScoringConfig = async (req, res) => {
  try {
    const body = req.body || {};
    const fields = ['specialtyMatch', 'bedAvailability', 'distance', 'costFit', 'slaHistory', 'preference'];
    const update = {};
    for (const f of fields) {
      if (body[f] != null) update[f] = Number(body[f]);
    }
    let doc = await ScoringConfig.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = new ScoringConfig(update);
    else Object.assign(doc, update);
    await doc.save();

    await logAction({
      req,
      action: 'SCORING_CONFIG_UPDATE',
      entityId: doc._id,
      entityModel: 'ScoringConfig',
      details: update
    });

    res.json({ success: true, data: doc });
  } catch (e) {
    const msg = e.message || 'Update failed';
    res.status(400).json({ success: false, message: msg });
  }
};

exports.listDepartments = async (req, res) => {
  try {
    const rows = await DepartmentCatalog.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list departments' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, keywords = [], sortOrder = 0 } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'name required' });
    }
    const row = await DepartmentCatalog.create({
      name: name.trim(),
      keywords: keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean),
      sortOrder,
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message || 'Create failed' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const row = await DepartmentCatalog.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, keywords, sortOrder, isActive } = req.body;
    if (name != null) row.name = String(name).trim();
    if (Array.isArray(keywords)) {
      row.keywords = keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean);
    }
    if (sortOrder != null) row.sortOrder = Number(sortOrder);
    if (typeof isActive === 'boolean') row.isActive = isActive;
    await row.save();
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message || 'Update failed' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await DepartmentCatalog.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

exports.getPlatformSettings = async (req, res) => {
  try {
    let doc = await PlatformSettings.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = await PlatformSettings.create({});
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

exports.updatePlatformSettings = async (req, res) => {
  try {
    const {
      defaultHospitalDeductionPercentage,
      defaultConsultantCommissionPercentage,
      walletThresholdPaisa,
      walletInitialHoldPaisa,
    } = req.body;

    let doc = await PlatformSettings.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = new PlatformSettings();

    if (defaultHospitalDeductionPercentage != null) {
      doc.defaultHospitalDeductionPercentage = Math.max(0, Math.min(100, Number(defaultHospitalDeductionPercentage)));
    }
    if (defaultConsultantCommissionPercentage != null) {
      doc.defaultConsultantCommissionPercentage = Math.max(0, Math.min(100, Number(defaultConsultantCommissionPercentage)));
    }
    if (walletThresholdPaisa != null) {
      doc.walletThresholdPaisa = Math.max(0, Number(walletThresholdPaisa));
    }
    if (walletInitialHoldPaisa != null) {
      doc.walletInitialHoldPaisa = Math.max(0, Number(walletInitialHoldPaisa));
    }

    await doc.save();

    await logAction({
      req,
      action: 'PLATFORM_SETTINGS_UPDATE',
      entityId: doc._id,
      entityModel: 'PlatformSettings',
      details: {
        defaultHospitalDeductionPercentage,
        defaultConsultantCommissionPercentage,
        walletThresholdPaisa,
        walletInitialHoldPaisa,
      }
    });

    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.listPayouts = async (req, res) => {
  try {
    const rows = await Payout.find()
      .populate({ path: 'consultantId', select: 'pmdcNumber specialty promoCode', populate: { path: 'userId', select: 'name email' } })
      .populate('referralId', 'referralCode patientName status createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

exports.markPayoutAsPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { note } = req.body;

    const payout = await Payout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    payout.status = 'paid';
    payout.note = note || payout.note;
    await payout.save();

    await logAction({
      req,
      action: 'PAYOUT_DISBURSED',
      entityId: payout._id,
      entityModel: 'Payout',
      details: { amountPaisa: payout.amountPaisa, consultantId: payout.consultantId }
    });

    res.json({ success: true, message: 'Payout marked as paid' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

exports.listAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate('consultantId', 'name')
      .populate('targetHospitalId', 'hospitalName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('listAllReferrals error:', error);
    res.status(500).json({ success: false, message: 'Failed to list referrals' });
  }
};

exports.overrideReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hospitalId, priority } = req.body;
    
    const referral = await Referral.findById(id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
    
    const updates = {};
    if (status) updates.status = status;
    if (hospitalId) updates.targetHospitalId = hospitalId;
    if (priority) updates.priority = priority;

    Object.assign(referral, updates);
    await referral.save();

    await logAction({
      req,
      action: 'ADMIN_OVERRIDE_REFERRAL',
      entityId: referral._id,
      entityModel: 'Referral',
      details: updates
    });

    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to override referral' });
  }
};

exports.listAllBeds = async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true })
      .select('hospitalName city bedsInventory')
      .lean();
    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch beds' });
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    
    const mappedLogs = logs.map(log => ({
      ...log,
      adminId: log.actorId
    }));

    res.json({ success: true, data: mappedLogs });
  } catch (error) {
    console.error('listAuditLogs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

exports.getConsultantProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let user = await User.findById(id).select('-passwordHash').lean();
    let consultant = null;
    if (user) {
      consultant = await Consultant.findOne({ userId: user._id }).lean();
    } else {
      consultant = await Consultant.findById(id).lean();
      if (consultant) {
        user = await User.findById(consultant.userId).select('-passwordHash').lean();
      }
    }

    if (!user || !consultant) {
      return res.status(404).json({ success: false, message: 'Consultant not found' });
    }

    // Referral Performance
    const referrals = await Referral.find({ consultantId: consultant._id }).lean();
    const totalReferrals = referrals.length;
    const acceptedReferrals = referrals.filter(r => ['accepted', 'admitted', 'closed'].includes(r.status)).length;
    const rejectedReferrals = referrals.filter(r => r.status === 'rejected').length;
    const emergencyReferrals = referrals.filter(r => r.urgency === 'emergency').length;

    // Average SLA Response Time
    const resolved = referrals.filter(r => r.acceptedAt);
    let averageSlaResponseTime = '—';
    if (resolved.length > 0) {
      const sumMs = resolved.reduce((acc, curr) => acc + (curr.acceptedAt.getTime() - curr.createdAt.getTime()), 0);
      const avgMin = Math.round(sumMs / (60000 * resolved.length));
      if (avgMin < 60) {
        averageSlaResponseTime = `${avgMin} mins`;
      } else {
        averageSlaResponseTime = `${(avgMin / 60).toFixed(1)} hours`;
      }
    }
    const successRate = totalReferrals > 0 ? Math.round((acceptedReferrals / totalReferrals) * 100) : 0;

    // Wallet Section
    const payouts = await Payout.find({ consultantId: consultant._id }).lean();
    const pendingAmountPaisa = payouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amountPaisa, 0);
    const withdrawnAmountPaisa = payouts.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amountPaisa, 0);
    
    const settings = await PlatformSettings.findOne().sort({ updatedAt: -1 });
    const commPct = consultant.commissionPercentage ?? settings?.defaultConsultantCommissionPercentage ?? 60;
    const commissionVal = `${commPct}% of platform's referral cut (Dynamic split)`;

    // Activity Logs
    const logs = await AuditLog.find({ actorId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const loginHistory = logs
      .filter(l => l.action === 'USER_LOGIN' || l.action?.toLowerCase().includes('login'))
      .map(l => ({
        time: l.createdAt,
        ip: l.ipAddress || 'Unknown IP',
        device: l.userAgent || 'Unknown Device'
      }));

    const referralActionsLog = logs
      .filter(l => l.entityModel === 'Referral' || l.action?.toLowerCase().includes('referral'))
      .map(l => ({
        time: l.createdAt,
        action: l.action,
        details: l.details || {}
      }));

    res.json({
      success: true,
      data: {
        user,
        profile: {
          ...consultant,
          performance: {
            totalReferrals,
            acceptedReferrals,
            rejectedReferrals,
            emergencyReferrals,
            averageSlaResponseTime,
            successRate
          },
          wallet: {
            currentBalancePaisa: consultant.walletBalance || 0,
            pendingAmountPaisa,
            withdrawnAmountPaisa,
            commissionStructure: commissionVal
          },
          loginHistory: loginHistory.slice(0, 5),
          referralActionsLog: referralActionsLog.slice(0, 5)
        }
      }
    });
  } catch (error) {
    console.error('getConsultantProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve consultant profile details' });
  }
};

exports.adminChangePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const bcrypt = require('bcrypt');
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    await logAction({
      req,
      action: 'ADMIN_CHANGE_PASSWORD',
      entityId: user._id,
      entityModel: 'User',
      details: { email: user.email }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

exports.adminDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'consultant') {
      await Consultant.deleteOne({ userId: user._id });
    } else if (user.role === 'hospital') {
      await Hospital.deleteOne({ userId: user._id });
    }
    
    await User.deleteOne({ _id: user._id });

    await logAction({
      req,
      action: 'ADMIN_DELETE_USER',
      entityId: user._id,
      entityModel: 'User',
      details: { email: user.email, role: user.role }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

exports.adminUpdateConsultantCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionPercentage } = req.body;

    if (commissionPercentage == null || isNaN(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({ success: false, message: 'Valid commission percentage (0-100) is required' });
    }

    let consultant = await Consultant.findOne({ userId: id });
    if (!consultant) {
      consultant = await Consultant.findById(id);
    }

    if (!consultant) {
      return res.status(404).json({ success: false, message: 'Consultant not found' });
    }

    consultant.commissionPercentage = Number(commissionPercentage);
    await consultant.save();

    await logAction({
      req,
      action: 'ADMIN_UPDATE_CONSULTANT_COMMISSION',
      entityId: consultant._id,
      entityModel: 'Consultant',
      details: { commissionPercentage }
    });

    res.json({ success: true, message: 'Consultant commission percentage updated successfully', data: consultant });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to update commission percentage' });
  }
};

exports.adminUpdateHospitalDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { deductionPercentage } = req.body;

    if (deductionPercentage == null || isNaN(deductionPercentage) || deductionPercentage < 0 || deductionPercentage > 100) {
      return res.status(400).json({ success: false, message: 'Valid deduction percentage (0-100) is required' });
    }

    let hospital = await Hospital.findOne({ userId: id });
    if (!hospital) {
      hospital = await Hospital.findById(id);
    }

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    hospital.deductionPercentage = Number(deductionPercentage);
    await hospital.save();

    await logAction({
      req,
      action: 'ADMIN_UPDATE_HOSPITAL_DEDUCTION',
      entityId: hospital._id,
      entityModel: 'Hospital',
      details: { deductionPercentage }
    });

    res.json({ success: true, message: 'Hospital deduction percentage updated successfully', data: hospital });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to update deduction percentage' });
  }
};

