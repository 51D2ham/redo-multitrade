const Wishlist = require('../models/wishlistModel');
const { Product } = require('../models/productModel');
const mongoose = require('mongoose');

/**
 * Get user's wishlist
 * GET /api/v1/wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user: req.userInfo.userId })
      .populate({
        path: 'product',
        select: 'title slug images variants rating totalStock category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    const formattedItems = wishlistItems
      .filter(item => item.product) // Remove deleted products
      .map(item => {
        const defaultVariant = item.product.variants?.find(v => v.isDefault) || item.product.variants?.[0];
        const price = defaultVariant?.price || 0;
        const originalPrice = defaultVariant?.originalPrice || null;
        const thumbnail = item.product.images?.[0] ? `/uploads/products/${item.product.images[0]}` : null;

        return {
          id: item._id,
          productId: item.product._id,
          thumbnail,
          slug: item.product.slug,
          title: item.product.title,
          categoryName: item.product.category?.name,
          rating: item.product.rating || 0,
          originalPrice,
          price,
          totalStock: item.product.totalStock || 0,
          addedAt: item.createdAt
        };
      });

    res.json({
      success: true,
      data: {
        items: formattedItems,
        itemCount: formattedItems.length
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist'
    });
  }
};

/**
 * Add or Remove item from wishlist
 * POST /api/v1/wishlist
 */
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body || {};

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required'
      });
    }

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    // Check if item already exists in wishlist
    const existingItem = await Wishlist.findOne({
      user: req.userInfo.userId,
      product: productId
    });

    if (existingItem) {
      // Remove from wishlist
      await Wishlist.findByIdAndDelete(existingItem._id);
      return res.json({
        success: true,
        message: 'Product removed from wishlist',
        action: 'removed'
      });
    } else {
      // Add to wishlist
      const wishlistItem = await Wishlist.create({
        user: req.userInfo.userId,
        product: productId
      });

      return res.status(201).json({
        success: true,
        message: 'Product added to wishlist',
        action: 'added',
        data: { id: wishlistItem._id }
      });
    }
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wishlist'
    });
  }
};



/**
 * Clear all wishlist items
 * DELETE /api/v1/wishlist
 */
exports.clearWishlist = async (req, res) => {
  try {
    const result = await Wishlist.deleteMany({ user: req.userInfo.userId });

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} items from wishlist`
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
};

