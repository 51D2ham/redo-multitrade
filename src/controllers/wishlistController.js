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
        select: 'title slug images price rating reviewCount status variants brand',
        populate: {
          path: 'brand',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    const formattedItems = wishlistItems.map(item => {
      if (!item.product) {
        return {
          id: item._id,
          product: null,
          variantSku: item.variantSku,
          addedAt: item.createdAt,
          status: 'product_deleted',
          message: 'Product no longer available'
        };
      }

      let variant = null;
      if (item.variantSku && item.product.variants?.length > 0) {
        variant = item.product.variants.find(v => v.sku === item.variantSku);
      }

      return {
        id: item._id,
        product: {
          id: item.product._id,
          title: item.product.title,
          slug: item.product.slug,
          image: item.product.images?.[0] || null,
          price: item.product.price,
          rating: item.product.rating,
          reviewCount: item.product.reviewCount,
          brand: item.product.brand?.name,
          status: item.product.status
        },
        variant: variant ? {
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          discountPrice: variant.discountPrice,
          stock: variant.stock,
          lowStockAlert: variant.lowStockAlert
        } : null,
        variantSku: item.variantSku,
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
 * Add item to wishlist
 * POST /api/v1/wishlist/items
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { productId, variantSku } = req.body || {};

    // Validate productId
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Validate variant if provided
    if (variantSku) {
      if (!product.variants || product.variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'This product does not have variants'
        });
      }

      const variant = product.variants.find(v => v.sku === variantSku);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: 'Variant not found'
        });
      }
    }

    // Check if item already exists in wishlist
    const existingItem = await Wishlist.findOne({
      user: req.userInfo.userId,
      product: productId,
      ...(variantSku && { variantSku })
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Create new wishlist item
    const wishlistData = {
      user: req.userInfo.userId,
      product: productId
    };

    if (variantSku) {
      wishlistData.variantSku = variantSku;
    }

    const wishlistItem = new Wishlist(wishlistData);
    await wishlistItem.save();

    // Populate product data for response
    await wishlistItem.populate({
      path: 'product',
      select: 'title slug images price rating reviewCount variants brand',
      populate: {
        path: 'brand',
        select: 'name'
      }
    });

    let variant = null;
    if (variantSku && wishlistItem.product.variants?.length > 0) {
      variant = wishlistItem.product.variants.find(v => v.sku === variantSku);
    }

    const responseData = {
      id: wishlistItem._id,
      product: {
        id: wishlistItem.product._id,
        title: wishlistItem.product.title,
        slug: wishlistItem.product.slug,
        image: wishlistItem.product.images?.[0] || null,
        price: wishlistItem.product.price,
        rating: wishlistItem.product.rating,
        reviewCount: wishlistItem.product.reviewCount,
        brand: wishlistItem.product.brand?.name
      },
      variant: variant ? {
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        discountPrice: variant.discountPrice,
        stock: variant.stock,
        lowStockAlert: variant.lowStockAlert
      } : null,
      variantSku: wishlistItem.variantSku,
      addedAt: wishlistItem.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: responseData
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add item to wishlist'
    });
  }
};

/**
 * Remove item from wishlist
 * DELETE /api/v1/wishlist/items/:itemId
 */
exports.removeWishlistItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID'
      });
    }

    const deletedItem = await Wishlist.findOneAndDelete({
      _id: itemId,
      user: req.userInfo.userId
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    console.error('Remove wishlist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from wishlist'
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
      message: `Cleared ${result.deletedCount} items from wishlist`,
      data: {
        items: [],
        itemCount: 0
      }
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
};

/**
 * Check if product is in wishlist
 * GET /api/v1/wishlist/check/:productId
 */
exports.checkWishlistStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantSku } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const query = {
      user: req.userInfo.userId,
      product: productId
    };

    if (variantSku) {
      query.variantSku = variantSku;
    }

    const wishlistItem = await Wishlist.findOne(query);

    res.json({
      success: true,
      data: {
        inWishlist: !!wishlistItem,
        wishlistItemId: wishlistItem?._id || null
      }
    });
  } catch (error) {
    console.error('Check wishlist status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status'
    });
  }
};