const express = require('express');
const router = express.Router();
const orderController = require('../../../controllers/checkoutController');
const orderStatusController = require('../../../controllers/orderStatusController');
const adminOrderController = require('../../../controllers/orderController');
const authMiddleware = require('../../../middlewares/customerAuth');

// Public API endpoints
router.get('/', adminOrderController.getAllPublicOrders);
router.get('/track/:trackingNumber', adminOrderController.trackOrder);

// Customer API endpoints (require auth)
router.post('/checkout', authMiddleware, orderController.checkout);
router.get('/order-history', authMiddleware, orderController.getOrderHistory);
router.get('/:orderId', authMiddleware, orderStatusController.getOrderDetails);

// Customer order cancellation endpoint
router.post('/:orderId/cancel', authMiddleware, orderStatusController.cancelOrder);

module.exports = router;