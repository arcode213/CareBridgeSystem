const express = require('express');
const router = express.Router();
const {
  getProfile,
  getDashboardStats,
  getTestCatalog,
  addTest,
  updateTest,
  deleteTest,
} = require('../controllers/labController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize(['laboratory']));

router.get('/me', getProfile);
router.get('/dashboard', getDashboardStats);
router.get('/tests', getTestCatalog);
router.post('/tests', addTest);
router.patch('/tests/:testId', updateTest);
router.delete('/tests/:testId', deleteTest);

module.exports = router;
