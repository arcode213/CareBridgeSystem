const mongoose = require('mongoose');

const HospitalDoctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    pmdcNumber: { type: String, default: '' },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    /** Current availability for referrals (Q4) */
    isAvailable: { type: Boolean, default: true },
    consultationFee: { type: Number }, // in paisa
    phone: { type: String },
    email: { type: String },
    recordPasswordHash: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for quick search by specialty within a hospital
HospitalDoctorSchema.index({ hospitalId: 1, specialty: 1 });

module.exports = mongoose.model('HospitalDoctor', HospitalDoctorSchema);
