const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

// Phone (WhatsApp) verification — primary flow
router.post('/verify-phone', authLimiter, authController.verifyPhone);
router.post('/resend-phone-otp', authLimiter, authController.resendPhoneOtp);

// Email verification — kept for legacy/backward compat
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.get('/platform-settings', authController.getPlatformBrandingSettings);

module.exports = router;

