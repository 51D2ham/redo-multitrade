const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const orderController = require('../../../controllers/orderController');

// Admin order management routes
router.get('/', adminAuth, orderController.getAllOrders);
router.get('/export', adminAuth, orderController.exportOrdersCSV);

// API endpoint for notifications
router.get('/api/recent', adminAuth, orderController.getRecentOrders);
router.get('/new', adminAuth, orderController.newOrder);
router.post('/', adminAuth, orderController.createOrder);
router.get('/:id', adminAuth, orderController.getOrderDetails);
router.get('/:id/edit', adminAuth, orderController.renderEditOrder);
router.put('/:id', adminAuth, orderController.updateOrder);
router.delete('/:id', adminAuth, orderController.deleteOrder);
router.patch('/:id/status', adminAuth, orderController.updateOrderStatus);
router.patch('/:id/payment', adminAuth, orderController.updatePaymentStatus);
router.patch('/:id/items/:itemIndex', adminAuth, orderController.updateOrderItem);
router.patch('/:id/items', adminAuth, orderController.bulkUpdateItems);

module.exports = router;