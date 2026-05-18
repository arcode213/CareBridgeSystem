const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(protect);
router.use(authorize(['admin']));

router.get('/users', adminController.listAllUsers);
router.get('/users/pending', adminController.listPendingUsers);
router.patch('/users/:id', adminController.updateUserStatus);
router.get('/consultants/:id/profile', adminController.getConsultantProfile);
router.post('/consultants/:id/commission', adminController.adminUpdateConsultantCommission);
router.post('/hospitals/:id/deduction', adminController.adminUpdateHospitalDeduction);
router.post('/users/:id/change-password', adminController.adminChangePassword);
router.delete('/users/:id', adminController.adminDeleteUser);

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
router.patch('/payouts/:payoutId', adminController.markPayoutAsPaid);

router.get('/referrals', adminController.listAllReferrals);
router.patch('/referrals/:id/override', adminController.overrideReferral);
router.get('/beds', adminController.listAllBeds);
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
