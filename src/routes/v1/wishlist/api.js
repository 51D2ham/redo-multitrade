const express = require('express');
const wishlistController = require('../../../controllers/wishlistController');
const customerAuth = require('../../../middlewares/customerAuth');

const router = express.Router();

// All wishlist routes require authentication
router.use(customerAuth);

// Wishlist routes
router.get('/', wishlistController.getWishlist);
router.post('/items', wishlistController.addToWishlist);
router.delete('/items/:itemId', wishlistController.removeWishlistItem);
router.delete('/', wishlistController.clearWishlist);

module.exports = router;
