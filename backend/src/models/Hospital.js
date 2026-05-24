const mongoose = require('mongoose');

const BedInventorySchema = new mongoose.Schema({
  ward: {
    type: String,
    enum: ['General', 'Private', 'ICU', 'NICU', 'PICU', 'HDU', 'Burns', 'Maternity', 'Psychiatric', 'Cardiac'],
    required: true
  },
  totalBeds: { type: Number, default: 0 },
  occupiedBeds: { type: Number, default: 0 },
  availableBeds: { type: Number, default: 0 },
});

const RatePackageSchema = new mongoose.Schema({
  department: { type: String, required: true },
  serviceName: { type: String, required: true },
  minPrice: { type: Number, required: true }, // in paisa
  maxPrice: { type: Number, required: true }, // in paisa
  effectiveDate: { type: Date, default: Date.now },
});

const HospitalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hospitalName: { type: String, required: true },
    registrationNumber: { type: String },
    /** Authorized representative / admin CNIC (text) */
    representativeCnic: { type: String, trim: true },
    /** Set when admin approves registration */
    isRegistrationVerified: { type: Boolean, default: false },
    /** Supporting documents for registration (Q3) */
    registrationDocuments: [
      {
        name: { type: String, required: true }, // e.g. "SHCC License", "Rate List"
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
    /** Custom branding for white-labeling (Q28) */
    branding: {
      primaryColor: { type: String, default: '#2980b9' },
      logoUrl: { type: String },
    },
    city: { type: String, default: 'Karachi' },
    area: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [67.0099, 24.8607] }, // [lng, lat] - default Karachi
    },
    departments: [{ type: String }], // e.g. ['Cardiology', 'Orthopedics', 'Neurology']
    bedsInventory: [BedInventorySchema],
    ratePackages: [RatePackageSchema],
    avgResponseTime: { type: Number, default: 60 }, // in minutes
    acceptanceRate: { type: Number, default: 80 }, // percentage
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    isActive: { type: Boolean, default: false },
    deductionPercentage: { type: Number, default: 20 }, // platform deduction percentage (e.g. 20%)
    /** Individual JazzCash Merchant Credentials (SRS §12.3) */
    paymentGatewayCredentials: {
      merchantId: { type: String, trim: true },
      password: { type: String, trim: true },
      integritySalt: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

HospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', HospitalSchema);
