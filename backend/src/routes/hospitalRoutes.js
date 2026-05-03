const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getHospitalAnalytics,
  getReferralPipeline,
  getBeds,
  updateBeds,
} = require('../controllers/hospitalController');
const admissionController = require('../controllers/admissionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize(['hospital']));

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getHospitalAnalytics);
router.get('/referrals-pipeline', getReferralPipeline);
router.get('/beds', getBeds);
router.patch('/beds', updateBeds);

router.get('/admissions', admissionController.listAdmissions);
router.post('/admissions', admissionController.createAdmission);
router.patch('/admissions/:id', admissionController.updateAdmission);
router.post('/admissions/:id/complete', admissionController.completeAdmission);

module.exports = router;
