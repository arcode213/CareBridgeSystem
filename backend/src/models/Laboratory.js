const mongoose = require('mongoose');

const LabRatePackageSchema = new mongoose.Schema({
  department: { type: String, required: true },
  serviceName: { type: String, required: true },
  pricePaisa: { type: Number, required: true }, // flat price in paisa
  effectiveDate: { type: Date, default: Date.now },
});

const LaboratorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    laboratoryName: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    representativeCnic: { type: String, required: true, trim: true },
    isRegistrationVerified: { type: Boolean, default: false },
    registrationDocuments: [
      {
        name: { type: String, required: true }, // e.g. "CNIC", "SHCC License", "Rate List"
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
    city: { type: String, default: 'Karachi' },
    area: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [67.0099, 24.8607] }, // [lng, lat]
    },
    departments: [{ type: String }], // e.g. ['Biochemistry', 'Haematology', 'Radiology']
    ratePackages: [LabRatePackageSchema],
    avgResponseTime: { type: Number, default: 60 }, // in minutes
    acceptanceRate: { type: Number, default: 80 }, // percentage
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    isActive: { type: Boolean, default: false },
    deductionPercentage: { type: Number, default: 20 }, // platform deduction percentage (e.g. 20%)
    
    // Wallet for payouts
    walletBalance: { type: Number, default: 0 }, // stored in paisa
    totalEarnings: { type: Number, default: 0 }, // stored in paisa
  },
  { timestamps: true }
);

LaboratorySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Laboratory', LaboratorySchema);
