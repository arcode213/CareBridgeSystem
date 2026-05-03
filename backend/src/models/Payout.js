const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema(
  {
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', required: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    amountPaisa: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['accrued', 'paid'], default: 'accrued' },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

PayoutSchema.index({ consultantId: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', PayoutSchema);
