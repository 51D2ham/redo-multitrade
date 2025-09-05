const express = require('express');
const router = express.Router();
const inventoryController = require('../../../controllers/inventoryController');
const authMiddleware = require('../../../middlewares/auth');

router.use(authMiddleware);

// Dashboard route removed; now handled by report dashboard

// Stock alerts
router.get('/low-stock', inventoryController.getLowStock);
router.get('/alerts', inventoryController.getLowStock);

// Movement history
router.get('/movements', inventoryController.getMovements);
router.get('/history', inventoryController.getMovements);

// Stock management actions
router.get('/restock', inventoryController.showRestockForm);
router.post('/restock', inventoryController.restock);
router.post('/adjust', inventoryController.adjustStock);
router.post('/stock/adjust', inventoryController.adjustStock);

// AJAX endpoints
router.get('/product/:id/variants', inventoryController.getProductVariants);

module.exports = router;
