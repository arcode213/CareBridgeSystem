const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Hospital = require('../models/Hospital');
const Referral = require('../models/Referral');
const Admission = require('../models/Admission');
const Payout = require('../models/Payout');
const DepartmentCatalog = require('../models/DepartmentCatalog');
const ScoringConfig = require('../models/ScoringConfig');
const PlatformSettings = require('../models/PlatformSettings');
const { logAction } = require('../utils/logger');

exports.listPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-passwordHash').sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      users.map(async (u) => {
        const base = { ...u };
        if (u.role === 'consultant') {
          base.profile = await Consultant.findOne({ userId: u._id }).select('pmdcNumber specialty clinicName clinicAddress').lean();
        } else if (u.role === 'hospital') {
          base.profile = await Hospital.findOne({ userId: u._id })
            .select('hospitalName registrationNumber departments bedsInventory address')
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
            .select('pmdcNumber specialty clinicName clinicAddress totalEarnings monthlyEarnings promoCode isVerified preferredHospitals')
            .lean();
        } else if (u.role === 'hospital') {
          base.profile = await Hospital.findOne({ userId: u._id })
            .select('hospitalName registrationNumber departments bedsInventory address city area isActive')
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
    const { payoutPaisaPerClosedCase } = req.body;
    let doc = await PlatformSettings.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = new PlatformSettings();
    if (payoutPaisaPerClosedCase != null) {
      doc.payoutPaisaPerClosedCase = Math.max(0, Number(payoutPaisaPerClosedCase));
    }
    await doc.save();

    await logAction({
      req,
      action: 'PLATFORM_SETTINGS_UPDATE',
      entityId: doc._id,
      entityModel: 'PlatformSettings',
      details: { payoutPaisaPerClosedCase }
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

