const mongoose = require('mongoose');

/** Consultant commission accrued from a lab referral. Mirrors Payout, kept separate. */
const LabPayoutSchema = new mongoose.Schema(
  {
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    labReferralId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabReferral', required: true },
    laboratoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    totalBillPaisa: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    deductionPercentage: { type: Number, default: 0 },
    platformCutPaisa: { type: Number, default: 0 },
    commissionPercentage: { type: Number, default: 0 },
    adminSharePaisa: { type: Number, default: 0 },
    status: { type: String, enum: ['accrued', 'paid', 'pending_withdrawal'], default: 'accrued' },
    note: { type: String, trim: true },
    weeklySettlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabSettlement',
      default: null,
    },
  },
  { timestamps: true }
);

LabPayoutSchema.index({ consultantId: 1, createdAt: -1 });

module.exports = mongoose.model('LabPayout', LabPayoutSchema);
