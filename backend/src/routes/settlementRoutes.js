const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const settlementController = require('../controllers/settlementController');

// All settlement routes require authentication
router.use(protect);

// Hospital Roles
router.get('/pending-admissions', authorize(['hospital']), settlementController.listPendingAdmissions);
router.post('/', authorize(['hospital']), settlementController.createSettlement);
router.post('/:id/upload-receipt', authorize(['hospital']), settlementController.uploadHospitalReceipt);
router.get('/hospital', authorize(['hospital']), settlementController.listHospitalSettlements);

// Admin Roles
router.get('/admin', authorize(['admin']), settlementController.adminListSettlements);
router.post('/admin/:id/verify', authorize(['admin']), settlementController.adminVerifyHospitalReceipt);
router.post('/admin/:id/payout', authorize(['admin']), settlementController.adminUploadConsultantPayout);

// Consultant Roles
router.get('/consultant', authorize(['consultant']), settlementController.consultantListPayouts);
router.post('/consultant/:id/verify', authorize(['consultant']), settlementController.consultantVerifyPayout);

// Laboratory Roles
router.get('/lab/pending-investigations', authorize(['laboratory']), settlementController.listPendingInvestigations);
router.post('/lab', authorize(['laboratory']), settlementController.createLabSettlement);
router.post('/lab/:id/upload-receipt', authorize(['laboratory']), settlementController.uploadLabReceipt);
router.get('/lab', authorize(['laboratory']), settlementController.listLabSettlements);

// Admin Lab Settlement Roles
router.get('/admin/lab', authorize(['admin']), settlementController.adminListLabSettlements);
router.post('/admin/lab/:id/verify', authorize(['admin']), settlementController.adminVerifyLabReceipt);
router.post('/admin/lab/:id/payout', authorize(['admin']), settlementController.adminUploadLabConsultantPayout);

// Consultant Lab Payout Roles
router.get('/consultant/lab', authorize(['consultant']), settlementController.consultantListLabPayouts);
router.post('/consultant/lab/:id/verify', authorize(['consultant']), settlementController.consultantVerifyLabPayout);

module.exports = router;
