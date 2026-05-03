const Hospital = require('../models/Hospital');
const Referral = require('../models/Referral');
const Admission = require('../models/Admission');

exports.getDashboardStats = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const referrals = await Referral.find({ targetHospitalId: hospital._id });

    const billed = await Admission.find({
      hospitalId: hospital._id,
      status: 'billed',
    }).select('billTotalPaisa');

    const revenuePaisa = billed.reduce((s, a) => s + (a.billTotalPaisa || 0), 0);

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter((r) => r.status === 'pending').length,
      acceptedReferrals: referrals.filter((r) => r.status === 'accepted').length,
      admittedReferrals: referrals.filter((r) => r.status === 'admitted').length,
      closedReferrals: referrals.filter((r) => r.status === 'closed').length,
      revenuePaisa,
      beds: hospital.bedsInventory,
      departments: hospital.departments || [],
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
};

/** FR-25 — conversion, response proxy, monthly billing totals (simplified). */
exports.getHospitalAnalytics = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const referrals = await Referral.find({ targetHospitalId: hospital._id }).lean();
    const pending = referrals.filter((r) => r.status === 'pending').length;
    const accepted = referrals.filter((r) => r.status === 'accepted').length;
    const admitted = referrals.filter((r) => r.status === 'admitted').length;
    const closed = referrals.filter((r) => r.status === 'closed').length;
    const rejected = referrals.filter((r) => r.status === 'rejected').length;
    const decided = accepted + admitted + closed + rejected;
    const conversionRate = decided > 0 ? Math.round((closed / decided) * 100) : 0;

    const admissions = await Admission.find({ hospitalId: hospital._id, status: 'billed' })
      .select('billTotalPaisa completedAt createdAt')
      .lean();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBillPaisa = admissions
      .filter((a) => a.completedAt && new Date(a.completedAt) >= startOfMonth)
      .reduce((s, a) => s + (a.billTotalPaisa || 0), 0);

    const byDayMap = {};
    for (const r of referrals) {
      const d = new Date(r.createdAt).toISOString().slice(0, 10);
      byDayMap[d] = (byDayMap[d] || 0) + 1;
    }
    const referralsByDay = Object.entries(byDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    res.json({
      success: true,
      data: {
        conversionRate,
        avgResponseTimeMinutes: hospital.avgResponseTime ?? 60,
        pending,
        accepted,
        admitted,
        closed,
        rejected,
        monthlyBillPaisa,
        totalBilledPaisa: admissions.reduce((s, a) => s + (a.billTotalPaisa || 0), 0),
        referralsByDay,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Analytics error' });
  }
};

/** Accepted / admitted referrals for admissions workflow */
exports.getReferralPipeline = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }
    const rows = await Referral.find({
      targetHospitalId: hospital._id,
      status: { $in: ['accepted', 'admitted'] },
    })
      .populate({
        path: 'consultantId',
        select: 'userId pmdcNumber',
        populate: { path: 'userId', select: 'name' },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const admissionIds = await Admission.find({
      referralId: { $in: rows.map((r) => r._id) },
    })
      .select('referralId status')
      .lean();
    const admByRef = Object.fromEntries(admissionIds.map((a) => [a.referralId.toString(), a]));

    const data = rows.map((r) => ({
      ...r,
      admission: admByRef[r._id.toString()] || null,
    }));

    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

exports.getBeds = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    res.json({ success: true, data: hospital.bedsInventory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching bed inventory' });
  }
};

exports.updateBeds = async (req, res) => {
  try {
    const { ward, availableBeds } = req.body;
    const hospital = await Hospital.findOne({ userId: req.user.id });

    const wardIndex = hospital.bedsInventory.findIndex((b) => b.ward === ward);
    if (wardIndex > -1) {
      hospital.bedsInventory[wardIndex].availableBeds = availableBeds;
      const total = hospital.bedsInventory[wardIndex].totalBeds;
      hospital.bedsInventory[wardIndex].occupiedBeds = Math.max(0, total - availableBeds);
      await hospital.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`hospital:${hospital._id.toString()}`).emit('BED_UPDATE', {
          hospitalId: hospital._id.toString(),
          beds: hospital.bedsInventory,
        });
      }

      res.json({ success: true, message: 'Bed inventory updated', data: hospital.bedsInventory });
    } else {
      res.status(404).json({ success: false, message: 'Ward not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating bed inventory' });
  }
};
