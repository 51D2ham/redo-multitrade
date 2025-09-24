const express = require('express');
const wishlistController = require('../../../controllers/wishlistController');
const customerAuth = require('../../../middlewares/customerAuth');

const router = express.Router();

// Security middleware
const { sanitizeInput, createRateLimit } = require('../../../middlewares/security');

// Parse JSON first
router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: true }));

// Handle text/plain as JSON
router.use(express.text({ limit: '1mb' }));
router.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain' && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // If not valid JSON, keep as string
    }
  }
  next();
});

// Apply security middleware after parsing
router.use(createRateLimit(15 * 60 * 1000, 30)); // 30 requests per 15 minutes

// Clean wishlist routes - all under same URL
router.get('/', customerAuth, wishlistController.getWishlist);        // GET all wishlist items
router.post('/', customerAuth, wishlistController.toggleWishlist);     // POST add/remove item
router.delete('/', customerAuth, wishlistController.clearWishlist);    // DELETE clear all

module.exports = router;