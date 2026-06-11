const LabReferral = require('../models/LabReferral');
const Laboratory = require('../models/Laboratory');
const Consultant = require('../models/Consultant');
const LabPayout = require('../models/LabPayout');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * Finalizes a lab referral's billing (mirror of billingService.finalizeAdmission):
 * 1. Recomputes discount-aware totals
 * 2. Marks the LabReferral 'closed'
 * 3. Accrues a LabPayout for the consultant (status 'accrued')
 *
 * Consultant balances are NOT auto-credited — they are officially credited once the
 * manual weekly lab settlement receipt/verification cycle completes (same as hospitals).
 */
exports.finalizeLabReferral = async (referralId, io) => {
  const referral = await LabReferral.findById(referralId);
  if (!referral || referral.status === 'closed') return referral;

  // 1. Recompute totals from services + the consultant-offered discount
  const gross = (referral.services || []).reduce((sum, s) => sum + (s.amountPaisa || 0), 0);
  const discountPct = referral.discountPercentage || 0;
  const discountAmt = Math.round(gross * (discountPct / 100));
  const billTotal = Math.max(0, gross - discountAmt);

  referral.grossAmountPaisa = gross;
  referral.discountAmountPaisa = discountAmt;
  referral.billTotalPaisa = billTotal;

  // 2. Resolve dynamic splits
  const settings = await PlatformSettings.findOne().sort({ updatedAt: -1 });
  const lab = await Laboratory.findById(referral.targetLaboratoryId);
  const consultant = await Consultant.findById(referral.consultantId);

  const defaultLabCut = settings?.defaultLabDeductionPercentage ?? 20;
  const defaultConsultantCut = settings?.defaultLabCommissionPercentage ?? 60;

  const deductionPercentage = lab?.deductionPercentage || defaultLabCut;
  const commissionPercentage = consultant?.commissionPercentage || defaultConsultantCut;

  const platformCutPaisa = Math.round(billTotal * (deductionPercentage / 100));
  const consultantSharePaisa = Math.round(platformCutPaisa * (commissionPercentage / 100));
  const adminSharePaisa = platformCutPaisa - consultantSharePaisa;

  // 3. Finalize the referral
  referral.status = 'closed';
  referral.completedAt = new Date();
  referral.closedAt = new Date();
  await referral.save();

  // 4. Accrue payout with full split audit details
  await LabPayout.create({
    consultantId: referral.consultantId,
    labReferralId: referral._id,
    laboratoryId: referral.targetLaboratoryId,
    amountPaisa: consultantSharePaisa,
    totalBillPaisa: billTotal,
    discountPercentage: discountPct,
    deductionPercentage,
    platformCutPaisa,
    commissionPercentage,
    adminSharePaisa,
    status: 'accrued',
    note: `Lab case closed — bill ${billTotal / 100} PKR (Lab Cut: ${deductionPercentage}%, Consultant split: ${commissionPercentage}%, Discount: ${discountPct}%)`,
  });

  console.log(
    `[LAB_BILLING] Accrued payout of ${consultantSharePaisa / 100} PKR for Consultant ${referral.consultantId} (LabReferral: ${referral._id})`
  );

  // 5. Emit real-time updates
  if (io) {
    io.to(`consultant:${referral.consultantId.toString()}`).emit('LAB_STATUS_UPDATE', {
      referralId: referral._id.toString(),
      status: 'closed',
    });
    if (referral.targetLaboratoryId) {
      io.to(`lab:${referral.targetLaboratoryId.toString()}`).emit('LAB_STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status: 'closed',
      });
    }
  }

  return referral;
};
