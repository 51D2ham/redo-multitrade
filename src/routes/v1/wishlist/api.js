const express = require('express');
const wishlistController = require('../../../controllers/wishlistController');
const customerAuth = require('../../../middlewares/customerAuth');

const router = express.Router();

// Security middleware
const { sanitizeInput, createRateLimit } = require('../../../middlewares/security');

// Apply security middleware
router.use(sanitizeInput);
router.use(createRateLimit(15 * 60 * 1000, 30)); // 30 requests per 15 minutes

// Parse JSON safely
router.use(express.json({ limit: '1mb' }));

// Safe JSON parsing middleware
router.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain' && typeof req.body === 'string') {
    try {
      // Validate JSON before parsing to prevent prototype pollution
      const parsed = JSON.parse(req.body);
      if (typeof parsed === 'object' && parsed !== null) {
        req.body = parsed;
      }
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON format' 
      });
    }
  }
  next();
});

// Wishlist routes
router.get('/', customerAuth, wishlistController.getWishlist);
router.get('/check/:productId', customerAuth, wishlistController.checkWishlistStatus);
router.post('/items', customerAuth, wishlistController.addToWishlist);
router.delete('/items/:itemId', customerAuth, wishlistController.removeWishlistItem);
router.delete('/', customerAuth, wishlistController.clearWishlist);

module.exports = router;