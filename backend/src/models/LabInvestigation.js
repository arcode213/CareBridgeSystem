const mongoose = require('mongoose');

const LabTestResultSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  resultValue: { type: String, default: '' },
  referenceRange: { type: String, default: '' },
  isCritical: { type: Boolean, default: false },
});

const LabInvestigationSchema = new mongoose.Schema(
  {
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral',
      required: true,
      unique: true,
    },
    laboratoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    status: {
      type: String,
      enum: [
        'order_received',       // Stage 1
        'awaiting_collection',  // Stage 2
        'collected',            // Stage 3
        'in_processing',        // Stage 4
        'awaiting_validation',  // Stage 5
        'completed',            // Stage 6
        'critical_value',       // Stage 5 (Panic value flag)
        'qc_failed',            // Stage 5 (QC fail, requires resample)
      ],
      default: 'order_received',
    },
    isStat: { type: Boolean, default: false }, // STAT / Emergency priority
    isRepeat: { type: Boolean, default: false }, // Repeat / Add-on
    qcFailureReason: { type: String },
    barcode: { type: String }, // Barcode generated in collection stage
    collectionDate: { type: Date },
    processingStartedAt: { type: Date },
    validationDate: { type: Date },
    completedAt: { type: Date },
    
    section: { type: String }, // Department/Section e.g. Biochemistry, Haematology
    investigations: [LabTestResultSchema],
    reportFileUrl: { type: String }, // PDF URL of final report
    
    // Billing & Settlement
    billTotalPaisa: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['pending', 'cash', 'jazzcash', 'easypaisa', 'bank_transfer', 'manual'],
      default: 'manual',
    },
    paymentReference: { type: String },
    weeklySettlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabWeeklySettlement',
      default: null,
    },
    comments: [
      {
        authorName: { type: String },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabInvestigation', LabInvestigationSchema);
