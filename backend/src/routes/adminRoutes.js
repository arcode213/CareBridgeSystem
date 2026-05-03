const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(protect);
router.use(authorize(['admin']));

router.get('/users/pending', adminController.listPendingUsers);
router.patch('/users/:id', adminController.updateUserStatus);

router.get('/analytics', adminController.getPlatformAnalytics);
router.get('/scoring', adminController.getScoringConfig);
router.put('/scoring', adminController.updateScoringConfig);
router.get('/departments', adminController.listDepartments);
router.post('/departments', adminController.createDepartment);
router.patch('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);
router.get('/settings', adminController.getPlatformSettings);
router.put('/settings', adminController.updatePlatformSettings);
router.get('/payouts', adminController.listPayouts);

module.exports = router;
