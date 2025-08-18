const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/auth');

// Main dashboard route
router.get('/', authMiddleware, dashboardController.getMainDashboard);

module.exports = router;