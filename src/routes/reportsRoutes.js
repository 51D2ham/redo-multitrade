const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const auth = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Comprehensive dashboard
router.get('/comprehensive', reportsController.getComprehensiveReport);

// Export reports
router.get('/export', reportsController.exportReports);

module.exports = router;