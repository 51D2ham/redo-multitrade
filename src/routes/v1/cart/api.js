const express = require('express');
const cartController = require('../../../controllers/cartController');
const authMiddleware = require('../../../middlewares/customerAuth');

const router = express.Router();

// Get all cart items
router.get('/', authMiddleware, cartController.getCart);
// Add single item to cart
router.post('/', authMiddleware, cartController.addToCart);
// Update single cart item
router.put('/items/:itemId', authMiddleware, cartController.updateCartItem);
// Delete single cart item
router.delete('/items/:itemId', authMiddleware, cartController.removeCartItem);
// Clear all cart items
router.delete('/', authMiddleware, cartController.clearCart);

module.exports = router;