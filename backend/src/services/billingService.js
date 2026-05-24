const Admission = require('../models/Admission');
const Referral = require('../models/Referral');
const Consultant = require('../models/Consultant');
const Payout = require('../models/Payout');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * Finalizes an admission:
 * 1. Marks Admission as 'billed'
 * 2. Marks Referral as 'closed'
 * 3. Accrues Payout for Consultant
 * 4. Updates Consultant balances
 */
exports.finalizeAdmission = async (admissionId, paymentMethod, paymentReference, io) => {
  const admission = await Admission.findById(admissionId).populate('referralId');
  if (!admission || admission.status === 'billed') return admission;

  const bill = admission.billTotalPaisa || 0;
  const pm = paymentMethod || admission.paymentMethod || 'manual';

  // 1. Get platform settings & calculate dynamic splits
  const settings = await PlatformSettings.findOne().sort({ updatedAt: -1 });
  const Hospital = require('../models/Hospital');
  const hospital = await Hospital.findById(admission.hospitalId);
  const consultant = await Consultant.findById(admission.consultantId);

  const defaultHospitalCut = settings?.defaultHospitalDeductionPercentage ?? 20;
  const defaultConsultantCut = settings?.defaultConsultantCommissionPercentage ?? 60;

  const deductionPercentage = hospital?.deductionPercentage ?? defaultHospitalCut;
  const commissionPercentage = consultant?.commissionPercentage ?? defaultConsultantCut;

  const totalBillPaisa = bill;
  const platformCutPaisa = Math.round(totalBillPaisa * (deductionPercentage / 100));
  const consultantSharePaisa = Math.round(platformCutPaisa * (commissionPercentage / 100));
  const adminSharePaisa = platformCutPaisa - consultantSharePaisa;

  const payoutAmount = consultantSharePaisa;

  // 2. Finalize Admission
  admission.status = 'billed';
  admission.paymentMethod = pm;
  admission.paymentReference = paymentReference || admission.paymentReference;
  admission.completedAt = new Date();
  await admission.save();

  // 3. Finalize Referral
  const refId = admission.referralId?._id || admission.referralId;
  const referral = await Referral.findById(refId);
  if (referral) {
    referral.status = 'closed';
    referral.closedAt = new Date();
    await referral.save();
  }

  // 4. Create Payout record with full split audit details
  await Payout.create({
    consultantId: admission.consultantId,
    referralId: refId,
    admissionId: admission._id,
    amountPaisa: payoutAmount,
    totalBillPaisa,
    deductionPercentage,
    platformCutPaisa,
    commissionPercentage,
    adminSharePaisa,
    status: 'accrued',
    note: `Case closed — bill ${bill/100} PKR (Hospital Cut: ${deductionPercentage}%, Consultant split: ${commissionPercentage}%)`,
  });

  // 5. Consultant wallet balance auto-credits are disabled under the manual weekly settlement workflow.
  // Payout is created in 'accrued' status above, and balance will be officially credited and paid
  // once the manual weekly settlement receipt upload and verification cycle completes.
  if (consultant) {
    // Only log the accrual for audit purposes
    console.log(`[BILLING] Accrued manual payout of ${payoutAmount/100} PKR for Consultant ${consultant._id} (Admission: ${admission._id})`);
  }

  // 6. Emit Socket updates
  if (io) {
    if (referral) {
      io.to(`consultant:${admission.consultantId.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status: 'closed',
      });
      io.to(`hospital:${admission.hospitalId.toString()}`).emit('STATUS_UPDATE', {
        referralId: referral._id.toString(),
        status: 'closed',
      });
    }
  }

  return admission;
};
