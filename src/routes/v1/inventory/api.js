const express = require('express');
const router = express.Router();
const inventoryController = require('../../../controllers/inventoryController');
const authMiddleware = require('../../../middlewares/auth');

router.use(authMiddleware);

// API endpoints
router.get('/low-stock', inventoryController.getLowStockAPI);
router.get('/movements', inventoryController.getMovementsAPI);
router.get('/dashboard', inventoryController.getDashboard);

module.exports = router;
