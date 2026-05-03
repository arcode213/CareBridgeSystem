const mongoose = require('mongoose');

const ConsultantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pmdcNumber: { type: String, required: true, unique: true },
    specialty: { type: String, required: true },
    clinicName: { type: String },
    clinicAddress: { type: String },
    city: { type: String, default: 'Karachi' },
    promoCode: { type: String, unique: true, sparse: true },
    preferredHospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
    totalEarnings: { type: Number, default: 0 }, // stored in paisa
    monthlyEarnings: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultant', ConsultantSchema);
