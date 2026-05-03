const mongoose = require('mongoose');

const ServiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amountPaisa: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AdmissionSchema = new mongoose.Schema(
  {
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral',
      required: true,
      unique: true,
    },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    status: {
      type: String,
      enum: ['active', 'discharged', 'billed'],
      default: 'active',
    },
    admitDate: { type: Date, default: Date.now },
    dischargeDate: { type: Date },
    services: [ServiceLineSchema],
    billTotalPaisa: { type: Number, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['pending', 'cash', 'jazzcash', 'easypaisa', 'bank_transfer'],
      default: 'pending',
    },
    paymentReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', AdmissionSchema);
