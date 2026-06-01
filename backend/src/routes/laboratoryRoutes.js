const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateProfile,
  unlockPatient,
  collectSample,
  routeSampleToSection,
  validateResults,
  uploadReport,
  listMyInvestigations
} = require('../controllers/laboratoryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize(['laboratory']));

router.get('/profile', getMyProfile);
router.patch('/profile', updateProfile);
router.post('/unlock-patient', unlockPatient);
router.get('/investigations', listMyInvestigations);
router.post('/investigations/:id/collect', collectSample);
router.post('/investigations/:id/process', routeSampleToSection);
router.post('/investigations/:id/validate', validateResults);
router.post('/investigations/:id/upload', uploadReport);

module.exports = router;
