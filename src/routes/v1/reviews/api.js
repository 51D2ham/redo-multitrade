const express = require('express');
const router = express.Router();
const reviewController = require('../../../controllers/reviewController');
const customerAuth = require('../../../middlewares/customerAuth');

// Public routes
router.get('/products/:productId', reviewController.getProductReviews);

// Protected routes (require authentication)
router.post('/', customerAuth, reviewController.addReview);
router.get('/my-reviews', customerAuth, reviewController.getUserReviews);
router.get('/:reviewId', customerAuth, reviewController.getReviewById);
router.put('/:reviewId', customerAuth, reviewController.updateReview);
router.delete('/:reviewId', customerAuth, reviewController.deleteReview);
router.get('/can-review/:productId', customerAuth, reviewController.canReviewProduct);

module.exports = router;