const Admission = require('../models/Admission');
const Hospital = require('../models/Hospital');
const { createJazzCashRequest, verifyJazzCashHash } = require('../services/jazzCashService');
const { logAction } = require('../utils/logger');

exports.initiateJazzCashPayment = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const hospital = await Hospital.findOne({ userId: req.user.id });
    
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const admission = await Admission.findOne({
      _id: admissionId,
      hospitalId: hospital._id
    }).populate('referralId');

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    if (admission.status === 'billed') {
      return res.status(400).json({ success: false, message: 'Payment already completed' });
    }

    const amountPaisa = admission.billTotalPaisa;
    if (!amountPaisa || amountPaisa <= 0) {
      return res.status(400).json({ success: false, message: 'Bill total not set' });
    }

    const jazzCashData = createJazzCashRequest(admission, amountPaisa);

    res.json({
      success: true,
      data: jazzCashData
    });
  } catch (error) {
    console.error('JazzCash Initiation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
};

exports.jazzCashCallback = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[PAYMENT] JazzCash Callback Received:', payload);

    if (!verifyJazzCashHash(payload)) {
      console.error('[PAYMENT] Hash Verification Failed');
      return res.status(400).send('Invalid Hash');
    }

    const responseCode = payload.pp_ResponseCode;
    const admissionId = payload.pp_BillReference;
    const txnRef = payload.pp_TxnRefNo;

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).send('Admission not found');
    }

    if (responseCode === '000') {
      // Success
      admission.status = 'billed'; // Or wait for manual closure if preferred, but usually billing marks it
      admission.paymentMethod = 'jazzcash';
      admission.paymentReference = txnRef;
      admission.completedAt = new Date();
      await admission.save();

      await logAction({
        actorId: admission.hospitalId, // System actor or hospital
        action: 'PAYMENT_SUCCESS',
        entityId: admission._id,
        entityModel: 'Admission',
        details: { gateway: 'jazzcash', txnRef, amount: payload.pp_Amount }
      });

      console.log(`[PAYMENT] Admission ${admissionId} marked as PAID via JazzCash`);
    } else {
      // Failed
      console.warn(`[PAYMENT] Transaction Failed: ${payload.pp_ResponseMessage}`);
      await logAction({
        actorId: admission.hospitalId,
        action: 'PAYMENT_FAILED',
        entityId: admission._id,
        entityModel: 'Admission',
        details: { gateway: 'jazzcash', responseCode, message: payload.pp_ResponseMessage }
      });
    }

    // JazzCash usually expects a redirect back to the merchant site or a specific response
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/hospital/admissions?status=${responseCode === '000' ? 'success' : 'failed'}`);
  } catch (error) {
    console.error('JazzCash Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
