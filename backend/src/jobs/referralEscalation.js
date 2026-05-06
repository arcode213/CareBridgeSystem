const Referral = require('../models/Referral');
const { slaDeadlineFromUrgency } = require('../utils/sla');
const { updateHospitalStats } = require('../services/statsService');

/**
 * Move pending referrals past SLA to the next hospital in rankedHospitalIds, or reject if none left.
 */
async function processReferralEscalations(io) {
  const now = new Date();
  const overdue = await Referral.find({
    status: 'pending',
    slaDeadline: { $lt: now },
  });

  for (const ref of overdue) {
    const ranked =
      ref.rankedHospitalIds?.length > 0 ? ref.rankedHospitalIds : [ref.targetHospitalId].filter(Boolean);

    if (!ranked.length || !ref.targetHospitalId) {
      continue;
    }

    const prevHospitalId = ref.targetHospitalId.toString();
    let idx = typeof ref.currentRankIndex === 'number' ? ref.currentRankIndex : 0;

    if (idx + 1 < ranked.length) {
      idx += 1;
      ref.currentRankIndex = idx;
      ref.targetHospitalId = ranked[idx];
      ref.slaDeadline = slaDeadlineFromUrgency(ref.urgency);
      await ref.save();
      
      // Update stats for the hospital that failed to respond
      await updateHospitalStats(prevHospitalId);

      if (io) {
        io.to(`hospital:${ref.targetHospitalId.toString()}`).emit('NEW_REFERRAL', {
          referralId: ref._id.toString(),
          hospitalId: ref.targetHospitalId.toString(),
        });
        io.to(`hospital:${prevHospitalId}`).emit('REFERRAL_ESCALATED', {
          referralId: ref._id.toString(),
        });
        io.to(`consultant:${ref.consultantId.toString()}`).emit('REFERRAL_ESCALATED', {
          referralId: ref._id.toString(),
          message: 'Referral escalated to next hospital (SLA)',
        });
      }
    } else {
      ref.status = 'rejected';
      ref.rejectionReason = 'SLA expired — no remaining hospital in queue';
      await ref.save();

      // Update stats for the final hospital that failed
      await updateHospitalStats(prevHospitalId);

      if (io) {
        io.to(`consultant:${ref.consultantId.toString()}`).emit('STATUS_UPDATE', {
          referralId: ref._id.toString(),
          status: 'rejected',
        });
      }
    }
  }
}

module.exports = { processReferralEscalations };
