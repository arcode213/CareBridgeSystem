/**
 * Mock Payment Service for JazzCash & EasyPaisa (SRS §12)
 * Simulates REST API flow for mobile wallet transactions.
 */

const simulatePaymentRequest = async ({ method, amountPaisa, phone, reference }) => {
  console.log(`[PAYMENT] Initiating ${method} for ${amountPaisa/100} PKR to ${phone}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 90% success rate for simulation
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    return {
      success: true,
      transactionId: `TXN-${Math.random().toString(36).toUpperCase().slice(2, 10)}`,
      status: 'completed',
      message: 'Transaction confirmed via mobile wallet'
    };
  } else {
    return {
      success: false,
      status: 'failed',
      message: 'Insufficient balance or user cancelled'
    };
  }
};

module.exports = { simulatePaymentRequest };
