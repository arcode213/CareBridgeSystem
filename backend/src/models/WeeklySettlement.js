const mongoose = require('mongoose');

const WeeklySettlementSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    
    // Admissions aggregated in this weekly summary
    admissionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admission' }],
    
    // Aggregated monetary values (in paisa)
    grossAmountPaisa: { type: Number, required: true, min: 0 },
    deductionPercentage: { type: Number, required: true }, // Snapshotted from hospital deductionPercentage at creation
    calculatedPlatformCutPaisa: { type: Number, required: true, min: 0 }, // grossAmountPaisa * (deductionPercentage / 100)
    
    // Bill summary document uploaded by hospital (PDF or image)
    billSummaryFileUrl: { type: String, required: true },
    
    // Hospital manual payment receipt details
    hospitalReceiptFileUrl: { type: String },
    hospitalPaidAt: { type: Date },
    rejectionReason: { type: String }, // Populated if admin rejects the hospital receipt
    
    // Overall status of this settlement cycle
    status: {
      type: String,
      enum: [
        'pending_payment',                  // Summary uploaded, hospital has not uploaded payment receipt
        'pending_admin_verification',       // Hospital paid, uploaded receipt, awaiting admin verification
        'paid_pending_consultant_payout',   // Admin verified hospital payment, admin needs to pay consultants
        'paid_pending_consultant_verification', // Admin paid consultants & uploaded receipts, waiting for consultant verification
        'completed'                         // All consultants confirmed receiving payout
      ],
      default: 'pending_payment'
    },
    
    adminVerifiedAt: { type: Date },
    adminVerifierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Breakdown of payouts for consultants in this cycle
    consultantPayouts: [
      {
        consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
        amountPaisa: { type: Number, required: true },
        commissionPercentage: { type: Number, required: true }, // Snapshotted from consultant commissionPercentage at creation
        payoutReceiptFileUrl: { type: String }, // Screenshot uploaded by admin proving manual bank/JazzCash payout
        paidAt: { type: Date },
        status: {
          type: String,
          enum: ['pending_payout', 'pending_verification', 'verified'],
          default: 'pending_payout'
        },
        verifiedAt: { type: Date }
      }
    ],
    notes: { type: String }
  },
  { timestamps: true }
);

WeeklySettlementSchema.index({ hospitalId: 1, billingPeriodStart: -1 });

module.exports = mongoose.model('WeeklySettlement', WeeklySettlementSchema);
