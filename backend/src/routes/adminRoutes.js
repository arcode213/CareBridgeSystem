const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const whatsappController = require('../controllers/whatsappController');

router.use(protect);
router.use(authorize(['admin']));

router.get('/users', adminController.listAllUsers);
router.get('/users/pending', adminController.listPendingUsers);
router.patch('/users/:id', adminController.updateUserStatus);
router.get('/consultants/:id/profile', adminController.getConsultantProfile);
router.get('/consultants/:id/patients', adminController.getConsultantPatients);
router.get('/hospitals/:id/patients', adminController.getHospitalPatients);
router.post('/consultants/:id/commission', adminController.adminUpdateConsultantCommission);
router.post('/hospitals/:id/deduction', adminController.adminUpdateHospitalDeduction);
router.post('/laboratories/:id/deduction', adminController.adminUpdateLaboratoryDeduction);
router.patch('/hospitals/:id', adminController.adminUpdateHospital);
router.get('/hospitals/:id/doctors', adminController.adminListHospitalDoctors);
router.post('/hospitals/:id/doctors', adminController.adminAddHospitalDoctor);
router.patch('/hospitals/:id/doctors/:doctorId', adminController.adminUpdateHospitalDoctor);
router.delete('/hospitals/:id/doctors/:doctorId', adminController.adminDeleteHospitalDoctor);
router.patch('/consultants/:id', adminController.adminUpdateConsultant);
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
router.patch('/referrals/:id', adminController.updateReferralFull);
router.delete('/referrals/:id', adminController.deleteReferral);
router.patch('/referrals/:id/override', adminController.overrideReferral);
router.get('/beds', adminController.listAllBeds);
router.patch('/beds/:hospitalId', adminController.adminUpdateHospitalBeds);
router.get('/admissions', adminController.listAllAdmissions);
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/audit-logs/laboratory/export', adminController.exportLaboratoryAuditLogs);

// WhatsApp messaging (admin)
router.get('/whatsapp/status', whatsappController.getWhatsAppStatus);
router.get('/whatsapp/users', whatsappController.listUsersForWhatsApp);
router.post('/whatsapp/send', whatsappController.sendWhatsAppMessage);

module.exports = router;

