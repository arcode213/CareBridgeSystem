const crypto = require('crypto');

/**
 * JazzCash API Integration Service (SRS §12)
 * Follows the JazzCash HTTP POST (Redirect) checkout flow.
 */

const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || 'T001';
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || 'password';
const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || 'salt';
const JAZZCASH_RETURN_URL = process.env.JAZZCASH_RETURN_URL || 'http://localhost:5000/api/payments/jazzcash-callback';
const JAZZCASH_API_URL = process.env.JAZZCASH_API_URL || 'https://sandbox.jazzcash.com.pk/CustomerPortal/transaction/Checkout';

const createJazzCashRequest = (admission, amountPaisa) => {
  const transactionId = `T${Date.now()}`;
  const now = new Date();
  const pp_TxnDateTime = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const pp_TxnExpiryDateTime = expiry.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

  const params = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: JAZZCASH_MERCHANT_ID,
    pp_SubMerchantID: '',
    pp_Password: JAZZCASH_PASSWORD,
    pp_TxnRefNo: transactionId,
    pp_Amount: amountPaisa, // In Paisa
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime,
    pp_BillReference: admission._id.toString(),
    pp_Description: `Medical Billing - ${admission.referralId?.referralCode || 'CareBridge'}`,
    pp_TxnExpiryDateTime,
    pp_ReturnURL: JAZZCASH_RETURN_URL,
    pp_SecureHash: '',
    pp_MPIMode: '1',
    pp_IsRegisteredCustomer: 'No',
    pp_BankID: '',
    pp_ProductID: '',
    pp_BasketQuantity: '1',
    pp_BasketPrice: amountPaisa,
    pp_CustomerID: admission.hospitalId.toString(),
    pp_CustomerEmail: '',
    pp_CustomerMobile: '',
    pp_MobileNumber: '',
    pp_CNIC: '',
  };

  // Sort keys alphabetically and generate Secure Hash
  const sortedKeys = Object.keys(params).sort();
  let hashString = JAZZCASH_INTEGRITY_SALT + '&';
  
  for (const key of sortedKeys) {
    if (params[key] !== '' && key !== 'pp_SecureHash') {
      hashString += params[key] + '&';
    }
  }
  hashString = hashString.slice(0, -1); // Remove trailing &

  const secureHash = crypto
    .createHmac('sha256', JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest('hex')
    .toUpperCase();

  params.pp_SecureHash = secureHash;

  return {
    url: JAZZCASH_API_URL,
    params
  };
};

const verifyJazzCashHash = (receivedParams) => {
  const { pp_SecureHash, ...params } = receivedParams;
  const sortedKeys = Object.keys(params).sort();
  
  let hashString = JAZZCASH_INTEGRITY_SALT + '&';
  for (const key of sortedKeys) {
    if (params[key] !== '' && key !== 'pp_SecureHash') {
      hashString += params[key] + '&';
    }
  }
  hashString = hashString.slice(0, -1);

  const expectedHash = crypto
    .createHmac('sha256', JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest('hex')
    .toUpperCase();

  return expectedHash === pp_SecureHash;
};

module.exports = { createJazzCashRequest, verifyJazzCashHash };
