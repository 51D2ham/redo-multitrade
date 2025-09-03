const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/export/excel', dashboardController.exportDashboardExcel);
router.get('/export/csv', dashboardController.exportDashboardCSV);

module.exports = router;