const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const reviewController = require('../../../controllers/reviewController');

// Admin review routes
router.get('/', adminAuth, reviewController.getAllReviews);
router.post('/:reviewId/approve', adminAuth, reviewController.approveReview);
router.post('/:reviewId/reject', adminAuth, reviewController.rejectReview);
router.delete('/:reviewId', adminAuth, reviewController.adminDeleteReview);

module.exports = router;