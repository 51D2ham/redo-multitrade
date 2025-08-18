const { Review, Product } = require('../models/productModel');
const mongoose = require('mongoose');

const reviewController = {
  // Add a review (requires authentication)
  addReview: async (req, res) => {
    try {
      const { productId, rating, review } = req.body;
      const userId = req.userInfo.userId;

      // Validation
      if (!productId || !rating || !review) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, rating, and review are required'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      if (review.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Review must be at least 10 characters long'
        });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({ product: productId, user: userId });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product'
        });
      }

      // Create review
      const newReview = await Review.create({
        product: productId,
        user: userId,
        rating: parseInt(rating),
        review: review.trim(),
        status: 'pending'
      });

      // Update product rating
      await updateProductRating(productId);

      const populatedReview = await Review.findById(newReview._id)
        .populate('user', 'fullname')
        .populate('product', 'title');

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: populatedReview
      });
    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get reviews for a product
  getProductReviews: async (req, res) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const skip = (page - 1) * limit;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      const [reviews, total, product] = await Promise.all([
        Review.find({ product: productId, status: 'approved' })
          .populate('user', 'fullname')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Review.countDocuments({ product: productId, status: 'approved' }),
        Product.findById(productId, 'title rating reviewCount')
      ]);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const totalPages = Math.ceil(total / limit);

      // Calculate rating distribution
      const ratingStats = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);

      const ratingDistribution = {
        5: 0, 4: 0, 3: 0, 2: 0, 1: 0
      };
      ratingStats.forEach(stat => {
        ratingDistribution[stat._id] = stat.count;
      });

      res.status(200).json({
        success: true,
        data: {
          product: {
            _id: product._id,
            title: product.title,
            rating: product.rating,
            reviewCount: product.reviewCount
          },
          reviews,
          ratingDistribution,
          pagination: {
            current: page,
            total: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            totalReviews: total
          }
        }
      });
    } catch (error) {
      console.error('Get product reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get user's reviews
  getUserReviews: async (req, res) => {
    try {
      const userId = req.userInfo.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ user: userId })
          .populate('product', 'title thumbnail slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Review.countDocuments({ user: userId })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: reviews,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          totalReviews: total
        }
      });
    } catch (error) {
      console.error('Get user reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Update a review
  updateReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { rating, review } = req.body;
      const userId = req.userInfo.userId;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
      }

      // Validation
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      if (review && review.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Review must be at least 10 characters long'
        });
      }

      // Find review and check ownership
      const existingReview = await Review.findOne({ _id: reviewId, user: userId });
      if (!existingReview) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you are not authorized to update it'
        });
      }

      // Update review and reset status to pending
      const updateData = { status: 'pending' };
      if (rating) updateData.rating = parseInt(rating);
      if (review) updateData.review = review.trim();

      const updatedReview = await Review.findByIdAndUpdate(
        reviewId,
        updateData,
        { new: true }
      ).populate('user', 'fullname').populate('product', 'title');

      // Update product rating if rating changed
      if (rating && rating !== existingReview.rating) {
        await updateProductRating(existingReview.product);
      }

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview
      });
    } catch (error) {
      console.error('Update review error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Delete a review
  deleteReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.userInfo.userId;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
      }

      // Find review and check ownership
      const review = await Review.findOne({ _id: reviewId, user: userId });
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you are not authorized to delete it'
        });
      }

      const productId = review.product;

      // Delete review
      await Review.findByIdAndDelete(reviewId);

      // Update product rating
      await updateProductRating(productId);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Delete review error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get single review by ID
  getReviewById: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.userInfo.userId;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
      }

      const review = await Review.findOne({ _id: reviewId, user: userId })
        .populate('user', 'fullname')
        .populate('product', 'title');

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you are not authorized to view it'
        });
      }

      res.status(200).json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Get review by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Check if user can review a product
  canReviewProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.userInfo.userId;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({ product: productId, user: userId });

      res.status(200).json({
        success: true,
        data: {
          canReview: !existingReview,
          hasReviewed: !!existingReview,
          existingReview: existingReview || null
        }
      });
    } catch (error) {
      console.error('Can review product error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Admin methods
  getAllReviews: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      const status = req.query.status || 'all';
      
      const filter = {};
      if (status !== 'all') {
        filter.status = status;
      }
      
      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate('user', 'fullname email')
          .populate('product', 'title slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Review.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('reviews/list', {
        title: 'Manage Reviews',
        reviews,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: { status },
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Get all reviews error:', error);
      req.flash('error', 'Error loading reviews');
      res.redirect('/admin/v1/staff/dashboard');
    }
  },

  approveReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      
      const review = await Review.findByIdAndUpdate(reviewId, { status: 'approved' });
      
      if (review) {
        await updateProductRating(review.product);
      }
      
      req.flash('success', 'Review approved successfully');
      
      // Redirect back to product reviews if coming from there
      const referer = req.get('Referer');
      if (referer && referer.includes('/products/') && referer.includes('/reviews')) {
        return res.redirect(referer);
      }
      
      res.redirect('/admin/v1/reviews');
    } catch (error) {
      console.error('Approve review error:', error);
      req.flash('error', 'Error approving review');
      res.redirect('/admin/v1/reviews');
    }
  },

  rejectReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      
      const review = await Review.findByIdAndUpdate(reviewId, { status: 'rejected' });
      
      if (review) {
        await updateProductRating(review.product);
      }
      
      req.flash('success', 'Review rejected successfully');
      
      // Redirect back to product reviews if coming from there
      const referer = req.get('Referer');
      if (referer && referer.includes('/products/') && referer.includes('/reviews')) {
        return res.redirect(referer);
      }
      
      res.redirect('/admin/v1/reviews');
    } catch (error) {
      console.error('Reject review error:', error);
      req.flash('error', 'Error rejecting review');
      res.redirect('/admin/v1/reviews');
    }
  },

  adminDeleteReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      
      const review = await Review.findById(reviewId);
      if (!review) {
        req.flash('error', 'Review not found');
        return res.redirect('/admin/v1/reviews');
      }
      
      const productId = review.product;
      
      await Review.findByIdAndDelete(reviewId);
      await updateProductRating(productId);
      
      req.flash('success', 'Review deleted successfully');
      
      // Redirect back to product reviews if coming from there
      const referer = req.get('Referer');
      if (referer && referer.includes('/products/') && referer.includes('/reviews')) {
        return res.redirect(referer);
      }
      
      res.redirect('/admin/v1/reviews');
    } catch (error) {
      console.error('Admin delete review error:', error);
      req.flash('error', 'Error deleting review');
      res.redirect('/admin/v1/reviews');
    }
  },

  // Product-specific reviews page
  getProductReviews: async (req, res) => {
    try {
      const { id: productId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      const status = req.query.status || 'all';
      
      // Get product details
      const product = await Product.findById(productId)
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name');
      
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }
      
      // Build filter
      const filter = { product: productId };
      if (status !== 'all') {
        filter.status = status;
      }
      
      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate('user', 'fullname email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Review.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('products/reviews', {
        title: `Reviews - ${product.title}`,
        product,
        reviews,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: { status },
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Get product reviews error:', error);
      req.flash('error', 'Error loading product reviews');
      res.redirect('/admin/v1/products');
    }
  }
};

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(stats[0].averageRating * 10) / 10,
        reviewCount: stats[0].totalReviews
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.error('Update product rating error:', error);
  }
}

module.exports = reviewController;