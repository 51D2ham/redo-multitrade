const express = require('express');
const wishlistController = require('../../../controllers/wishlistController');
const customerAuth = require('../../../middlewares/customerAuth');

const router = express.Router();

// Parse JSON and text/plain
router.use(express.json());
router.use(express.text({ type: 'text/plain' }));
router.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain' && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

// Wishlist routes
router.get('/', customerAuth, wishlistController.getWishlist);
router.post('/items', customerAuth, wishlistController.addToWishlist);
router.delete('/items/:itemId', customerAuth, wishlistController.removeWishlistItem);
router.delete('/', customerAuth, wishlistController.clearWishlist);

module.exports = router;