const express = require('express');
const router = express.Router();
const inventoryController = require('../../../controllers/inventoryController');
const authMiddleware = require('../../../middlewares/auth');

// Apply auth middleware to specific routes instead of all
// router.use(authMiddleware);

// API endpoints
router.get('/low-stock', authMiddleware, inventoryController.getLowStockAPI);
router.get('/movements', authMiddleware, inventoryController.getMovementsAPI);
router.post('/update-global-threshold', inventoryController.updateGlobalThreshold);
// Dashboard route removed; now handled by report dashboard

module.exports = router;
