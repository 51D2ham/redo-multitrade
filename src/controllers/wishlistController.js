const Wishlist = require('../models/wishlistModel');
const { Product } = require('../models/productModel');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

// Helper format
const formatWishlistItem = (item) => ({
  id: item._id,
  product: {
    id: item.product._id,
    title: item.product.title,
    thumbnails: item.product.thumbnails,
    price: item.product.price,
    rating: item.product.rating,
    slug: item.product.slug
  },
  variantSku: item.variantSku,
  addedAt: item.createdAt
});

// GET 
exports.getWishlist = async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user: req.userInfo.userId })
      .populate('product', 'title thumbnails price rating slug')
      .sort({ createdAt: -1 });

    const formattedItems = wishlistItems.map(formatWishlistItem);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { items: formattedItems, itemCount: formattedItems.length }
    });
  } catch (error) {
    console.error('Get Wishlist Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to retrieve wishlist' });
  }
};

// POST 
exports.addToWishlist = async (req, res) => {
  try {
    const { productId, variantSku } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId)
      .select('title thumbnails price rating slug variants');

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    // Validate variant if provided
    if (variantSku) {
      const variant = product.variants?.find(v => v.sku === variantSku);
      if (!variant) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid variant SKU' });
      }
    }

    const existingItem = await Wishlist.findOne({ 
      user: req.userInfo.userId, 
      product: productId,
      ...(variantSku && { variantSku })
    });
    
    if (existingItem) {
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: 'Product already in wishlist' });
    }

    const wishlistItem = new Wishlist({
      user: req.userInfo.userId,
      product: productId,
      ...(variantSku && { variantSku })
    });

    await wishlistItem.save();
    await wishlistItem.populate('product', 'title thumbnails price rating slug');

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Product added to wishlist',
      data: formatWishlistItem(wishlistItem)
    });
  } catch (error) {
    console.error('Add to Wishlist Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to add item to wishlist' });
  }
};

// DELETE 
exports.removeWishlistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid item ID' });
    }
    
    const deletedItem = await Wishlist.findOneAndDelete({ 
      _id: itemId, 
      user: req.userInfo.userId 
    });
    
    if (!deletedItem) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Wishlist item not found' });
    }

    res.status(StatusCodes.OK).json({ 
      success: true, 
      message: 'Item removed from wishlist' 
    });
  } catch (error) {
    console.error('Remove Wishlist Item Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to remove item from wishlist' });
  }
};

// DELETE 
exports.clearWishlist = async (req, res) => {
  try {
    const result = await Wishlist.deleteMany({ user: req.userInfo.userId });
    
    res.status(StatusCodes.OK).json({ 
      success: true, 
      message: `Cleared ${result.deletedCount} items from wishlist`,
      data: { items: [], itemCount: 0 } 
    });
  } catch (error) {
    console.error('Clear Wishlist Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to clear wishlist' });
  }
};