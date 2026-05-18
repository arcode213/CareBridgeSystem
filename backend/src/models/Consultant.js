const mongoose = require('mongoose');

const ConsultantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pmdcNumber: { type: String, required: true, unique: true },
    cnic: { type: String },
    specialty: { type: String, required: true },
    clinicName: { type: String },
    clinicAddress: { type: String },
    city: { type: String, default: 'Karachi' },
    promoCode: { type: String, unique: true, sparse: true },
    preferredHospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
    /** Automated preference learning (Q5) - Hospital ID string -> Count */
    referralHistoryCount: {
      type: Map,
      of: Number,
      default: {},
    },
    /** Wallet for PKR payouts (Q14/Q16) */
    walletBalance: { type: Number, default: 0 }, // in paisa
    totalEarnings: { type: Number, default: 0 }, // stored in paisa
    monthlyEarnings: { type: Number, default: 0 },
    /** PMDC certificate and other verification files (Q1) */
    verificationDocuments: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
    isVerified: { type: Boolean, default: false },
    commissionPercentage: { type: Number, default: 60 }, // consultant commission split percentage (e.g. 60%)
    /** Payout details (Q16) */
    payoutAccount: {
      accountType: { type: String, enum: ['jazzcash', 'easypaisa', 'bank'], default: 'jazzcash' },
      accountNumber: { type: String, trim: true },
      accountHolder: { type: String, trim: true },
      bankName: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultant', ConsultantSchema);
