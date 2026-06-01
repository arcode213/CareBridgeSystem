const mongoose = require('mongoose');

const LabWeeklySettlementSchema = new mongoose.Schema(
  {
    laboratoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    
    // Lab investigations aggregated in this weekly summary
    labInvestigationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabInvestigation' }],
    
    // Aggregated monetary values (in paisa)
    grossAmountPaisa: { type: Number, required: true, min: 0 },
    deductionPercentage: { type: Number, required: true }, // Snapshotted from laboratory deductionPercentage
    calculatedPlatformCutPaisa: { type: Number, required: true, min: 0 }, // grossAmountPaisa * (deductionPercentage / 100)
    
    // Bill summary document uploaded by laboratory (PDF or image)
    billSummaryFileUrl: { type: String, required: true },
    
    // Laboratory manual payment receipt details
    laboratoryReceiptFileUrl: { type: String },
    laboratoryPaidAt: { type: Date },
    rejectionReason: { type: String }, // Populated if admin rejects the receipt
    
    // Overall status of this settlement cycle
    status: {
      type: String,
      enum: [
        'pending_payment',                  // Summary uploaded, laboratory has not uploaded receipt
        'pending_admin_verification',       // Lab paid, uploaded receipt, awaiting admin verification
        'paid_pending_consultant_payout',   // Admin verified lab payment, admin needs to pay consultants
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
        commissionPercentage: { type: Number, required: true }, // Snapshotted from consultant commissionPercentage
        payoutReceiptFileUrl: { type: String }, // Screenshot proving manual transfer
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

LabWeeklySettlementSchema.index({ laboratoryId: 1, billingPeriodStart: -1 });

module.exports = mongoose.model('LabWeeklySettlement', LabWeeklySettlementSchema);
