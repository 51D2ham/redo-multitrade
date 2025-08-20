const Cart = require('../models/cartModel');
const { Product } = require('../models/productModel');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

// Format cart item response
const formatCartItem = (item) => {
  let variant = null;
  if (item.variantSku && item.product?.variants) {
    variant = item.product.variants.find(v => v.sku === item.variantSku);
  }
  
  return {
    id: item._id,
    product: {
      id: item.product._id,
      title: item.product.title,
      thumbnail: item.product.thumbnail,
      price: item.product.price
    },
    variant: variant ? {
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      price: variant.price,
      discountPrice: variant.discountPrice,
      qty: variant.qty,
      status: variant.status
    } : null,
    qty: item.qty,
    productType: item.productType,
    productPrice: item.productPrice,
    totalPrice: item.totalPrice,
    variantSku: item.variantSku
  };
};

// Get all cart items
exports.getCart = async (req, res) => {
  try {
    const cartItems = await Cart.find({ user: req.userInfo.userId })
      .populate({
        path: 'product',
        select: 'title price thumbnail images slug variants status',
        populate: {
          path: 'category',
          select: 'name'
        }
      });
    
    const formattedItems = cartItems.map(item => {
      if (!item.product) {
        return {
          id: item._id,
          product: null,
          qty: item.qty,
          productPrice: item.productPrice,
          totalPrice: item.totalPrice,
          status: 'product_deleted',
          message: 'Product no longer available'
        };
      }

      let stockStatus = 'in_stock';
      let stockMessage = '';
      let availableQty = 0;

      // Check product status
      if (item.product.status !== 'active') {
        stockStatus = 'inactive';
        stockMessage = 'Product is no longer active';
      } else if (item.product.variants?.length > 0) {
        // Check specific variant stock if variantSku exists
        let targetVariant;
        if (item.variantSku) {
          targetVariant = item.product.variants.find(v => v.sku === item.variantSku);
        } else {
          targetVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
        }
        
        if (targetVariant) {
          availableQty = targetVariant.qty;
          if (targetVariant.status === 'out_of_stock' || targetVariant.qty === 0) {
            stockStatus = 'out_of_stock';
            stockMessage = 'Currently out of stock';
          } else if (targetVariant.qty < item.qty) {
            stockStatus = 'limited_stock';
            stockMessage = `Only ${targetVariant.qty} available`;
          }
        } else if (item.variantSku) {
          stockStatus = 'variant_not_found';
          stockMessage = 'Selected variant no longer available';
        }
      }

      return {
        id: item._id,
        product: {
          id: item.product._id,
          title: item.product.title,
          thumbnail: item.product.thumbnail,
          price: item.product.price,
          slug: item.product.slug
        },
        variant: item.variantSku && item.product.variants ? 
          item.product.variants.find(v => v.sku === item.variantSku) : null,
        qty: item.qty,
        productType: item.productType,
        productPrice: item.productPrice,
        totalPrice: item.totalPrice,
        stockStatus,
        stockMessage,
        availableQty,
        createdAt: item.createdAt
      };
    });

    // Calculate totals only for available items
    const availableItems = formattedItems.filter(item => 
      item.stockStatus === 'in_stock' || item.stockStatus === 'limited_stock'
    );
    const totalPrice = availableItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = availableItems.reduce((sum, item) => sum + item.qty, 0);
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        items: formattedItems,
        totalPrice,
        totalItems,
        availableItems: availableItems.length,
        outOfStockItems: formattedItems.filter(item => item.stockStatus === 'out_of_stock').length
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get cart items'
    });
  }
};


// Add single item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, qty = 1, variantSku } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid product ID required'
      });
    }

    if (qty < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const product = await Product.findById(productId).populate('category', 'name');
    if (!product || product.status !== 'active') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Product not available'
      });
    }

    let productPrice = product.price;
    let selectedVariant = null;
    let finalVariantSku = null;
    
    // FORCE variant assignment for products with variants
    if (product.variants && product.variants.length > 0) {
      if (variantSku) {
        selectedVariant = product.variants.find(v => v.sku === variantSku);
        if (!selectedVariant) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Variant not found'
          });
        }
      } else {
        // Use default variant if no variant specified
        selectedVariant = product.variants.find(v => v.isDefault) || product.variants[0];
      }
      
      finalVariantSku = selectedVariant.sku;
      productPrice = selectedVariant.discountPrice || selectedVariant.price;
      
      if (selectedVariant.status === 'out_of_stock' || selectedVariant.qty === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'This variant is out of stock'
        });
      }
      
      if (selectedVariant.qty < qty) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Only ${selectedVariant.qty} items available`
        });
      }
    }

    // Check if this exact product+variant combination already exists in cart
    const cartQuery = {
      user: req.userInfo.userId,
      product: productId
    };
    
    // Include variant SKU in query if we have one
    if (finalVariantSku) {
      cartQuery.variantSku = finalVariantSku;
    }
    
    const existingItem = await Cart.findOne(cartQuery);

    let isUpdate = false;
    
    if (existingItem) {
      // Same product exists, update quantity
      const newQty = existingItem.qty + qty;
      if (selectedVariant && selectedVariant.qty < newQty) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Cannot add ${qty} more. Only ${selectedVariant.qty - existingItem.qty} available`
        });
      }
      
      existingItem.qty = newQty;
      existingItem.totalPrice = newQty * existingItem.productPrice;
      await existingItem.save();
      isUpdate = true;
    } else {
      // Create new cart item with FORCED variant SKU
      const cartData = {
        qty,
        productType: product.category?.name || 'General',
        productPrice,
        totalPrice: qty * productPrice,
        user: req.userInfo.userId,
        product: productId
      };
      
      // ALWAYS add variant SKU for products with variants
      if (finalVariantSku) {
        cartData.variantSku = finalVariantSku;
      } else if (product.variants && product.variants.length > 0) {
        const defaultVar = product.variants.find(v => v.isDefault) || product.variants[0];
        cartData.variantSku = defaultVar.sku;
      }
      
      const cartItem = new Cart(cartData);
      await cartItem.save();
    }
    
    // Get all cart items for response
    const cartItems = await Cart.find({ user: req.userInfo.userId })
      .populate({
        path: 'product',
        select: 'title price thumbnail images slug variants status',
        populate: { path: 'category', select: 'name' }
      });
    
    const totalPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

    res.status(StatusCodes.OK).json({
      success: true,
      message: isUpdate ? 'Product already exists in cart. Quantity updated.' : 'Item added to cart successfully',
      data: {
        items: cartItems.map(formatCartItem),
        totalPrice,
        totalItems
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    
    // Handle duplicate key error gracefully
    if (error.code === 11000 && error.message.includes('user_1')) {
      // Clear user's cart and retry
      try {
        await Cart.deleteMany({ user: req.userInfo.userId });
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Cart reset due to database conflict. Please try adding the item again.',
          data: { items: [], totalPrice: 0, totalItems: 0 }
        });
      } catch (clearError) {
        console.error('Cart clear error:', clearError);
      }
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to add item to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update single cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { qty } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId) || qty < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid item ID or quantity'
      });
    }

    const cartItem = await Cart.findOne({
      _id: itemId,
      user: req.userInfo.userId
    }).populate('product');

    if (!cartItem) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.qty = qty;
    await cartItem.save();

    const cartItems = await Cart.getUserCart(req.userInfo.userId);
    const cartTotal = await Cart.getCartTotal(req.userInfo.userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cart item updated',
      data: {
        items: cartItems.map(formatCartItem),
        totalPrice: cartTotal.total,
        totalItems: cartTotal.count
      }
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
};

// Delete single cart item
exports.removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid item ID'
      });
    }

    const deletedItem = await Cart.findOneAndDelete({
      _id: itemId,
      user: req.userInfo.userId
    });

    if (!deletedItem) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    const cartItems = await Cart.getUserCart(req.userInfo.userId);
    const cartTotal = await Cart.getCartTotal(req.userInfo.userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cartItems.map(formatCartItem),
        totalPrice: cartTotal.total,
        totalItems: cartTotal.count
      }
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to remove item'
    });
  }
};

// Clear all cart items
exports.clearCart = async (req, res) => {
  try {
    await Cart.deleteMany({ user: req.userInfo.userId });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        totalPrice: 0,
        totalItems: 0
      }
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
};

