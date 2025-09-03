const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');
const Cart = require('../models/cartModel');
const { Product } = require('../models/productModel');
const User = require('../models/userRegisterModel');
const { sendOrderConfirmation } = require('../utils/orderNotification');
const InventoryService = require('../services/inventoryService');
const NotificationService = require('../services/notificationService');

// Import models
const { Order, CartOrder } = require('../models/orderModel');
const ShippingAddress = require('../models/shippingAddressSchema');

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>"'&]/g, '');
};

// Validate ObjectId helper
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

exports.checkout = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();
    
    const userId = req.userInfo.userId;
    const { paymentMethod = 'cod', shippingAddress, useNewAddress = true, addressId, cartItemIds } = req.body;

    // Enhanced validation
    if (!isValidObjectId(userId)) {
      await session.abortTransaction();
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid user session'
      });
    }

    // Validate payment method
    const validPaymentMethods = ['cod', 'online', 'card', 'paypal'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment method. Allowed: ' + validPaymentMethods.join(', ')
      });
    }

    // Validate cart item IDs if provided
    if (cartItemIds && Array.isArray(cartItemIds)) {
      const invalidIds = cartItemIds.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        await session.abortTransaction();
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid cart item IDs provided'
        });
      }
    }

    // Get user's cart items (all or specific items for selective checkout)
    const cartQuery = { user: new mongoose.Types.ObjectId(userId) };
    if (cartItemIds && cartItemIds.length > 0) {
      cartQuery._id = { $in: cartItemIds.map(id => new mongoose.Types.ObjectId(id)) };
    }
    
    const cartItems = await Cart.find(cartQuery)
      .populate({
        path: 'product',
        select: 'title price thumbnail images slug variants status totalStock',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .session(session);

    if (!cartItems || cartItems.length === 0) {
      await session.abortTransaction();
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Cart is empty or selected items not found'
      });
    }

    // Check cart items stock status (same logic as cart getCart)
    const outOfStockItems = [];
    const availableItems = [];

    for (const item of cartItems) {
      if (!item.product) {
        outOfStockItems.push('Product no longer available');
        continue;
      }

      let isAvailable = true;
      let stockMessage = '';

      // Check product status
      if (item.product.status !== 'active') {
        isAvailable = false;
        stockMessage = `${item.product.title} is no longer active`;
      } else if (item.product.variants?.length > 0) {
        // Check specific variant stock - use provided variant or default
        let targetVariant;
        if (item.variantSku) {
          targetVariant = item.product.variants.find(v => v.sku === item.variantSku);
        } else {
          targetVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
          // Assign default variant to cart item for checkout
          if (targetVariant) {
            item.variantSku = targetVariant.sku;
          }
        }
        
        if (targetVariant) {
          if (targetVariant.stock === 0) {
            isAvailable = false;
            stockMessage = `${item.product.title} is currently out of stock`;
          } else if (targetVariant.stock < item.qty) {
            isAvailable = false;
            stockMessage = `Only ${targetVariant.stock} available for ${item.product.title}, but ${item.qty} in cart`;
          }
        } else if (item.variantSku) {
          isAvailable = false;
          stockMessage = `Selected variant for ${item.product.title} is no longer available`;
        }
      }

      if (isAvailable) {
        availableItems.push(item);
      } else {
        outOfStockItems.push(stockMessage);
      }
    }

    // Prevent checkout if any items are out of stock
    if (outOfStockItems.length > 0) {
      await session.abortTransaction();
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Cannot proceed to checkout. Some items are out of stock.',
        outOfStockItems,
        availableItems: availableItems.length,
        suggestion: 'Please update your cart and try again'
      });
    }

    // Handle shipping address
    let finalShippingAddress;
    
    if (useNewAddress) {
      if (!shippingAddress) {
        await session.abortTransaction();
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Shipping address is required'
        });
      }

      const requiredFields = ['fullname', 'street', 'city', 'state', 'postalCode', 'country', 'phone'];
      const missingFields = requiredFields.filter(field => !shippingAddress[field] || !shippingAddress[field].toString().trim());

      if (missingFields.length > 0) {
        await session.abortTransaction();
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Missing required address fields: ${missingFields.join(', ')}`
        });
      }

      // Sanitize address fields
      Object.keys(shippingAddress).forEach(key => {
        if (typeof shippingAddress[key] === 'string') {
          shippingAddress[key] = sanitizeInput(shippingAddress[key].trim());
        }
      });

      // Create new shipping address
      const newAddress = new ShippingAddress({
        ...shippingAddress,
        user: new mongoose.Types.ObjectId(userId)
      });
      await newAddress.save({ session });
      finalShippingAddress = newAddress._id;
    } else {
      if (!addressId || !isValidObjectId(addressId)) {
        await session.abortTransaction();
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Valid address ID is required when using saved address'
        });
      }

      const existingAddress = await ShippingAddress.findOne({
        _id: new mongoose.Types.ObjectId(addressId),
        user: new mongoose.Types.ObjectId(userId)
      }).session(session);

      if (!existingAddress) {
        await session.abortTransaction();
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Shipping address not found or does not belong to user'
        });
      }
      finalShippingAddress = addressId;
    }

    // Calculate totals from available items only
    const totalPrice = availableItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItem = availableItems.length;
    const totalQty = availableItems.reduce((sum, item) => sum + item.qty, 0);

    // Create order items with enhanced variant handling
    const orderItems = availableItems.map(item => {
      const orderItem = {
        productId: item.product._id,
        productTitle: item.product.title,
        productPrice: item.productPrice,
        qty: item.qty,
        totalPrice: item.totalPrice,
        status: 'pending' // Initialize all items as pending
      };
      
      // Enhanced variant handling for mixed order tracking
      if (item.product.variants && item.product.variants.length > 0) {
        let selectedVariant = null;
        
        // Priority 1: Use cart's variant SKU if available
        if (item.variantSku) {
          selectedVariant = item.product.variants.find(v => v.sku === item.variantSku);
        }
        
        // Priority 2: Use default variant if no cart variant
        if (!selectedVariant) {
          selectedVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
          // Update cart item with selected variant for consistency
          if (selectedVariant) {
            item.variantSku = selectedVariant.sku;
          }
        }
        
        // ALWAYS save complete variant info for mixed order tracking
        if (selectedVariant) {
          orderItem.variantSku = selectedVariant.sku;
          orderItem.variantDetails = {
            color: selectedVariant.color || null,
            size: selectedVariant.size || null,
            material: selectedVariant.material || null,
            weight: selectedVariant.weight || null,
            dimensions: selectedVariant.dimensions || null
          };
          
          // Price validation and correction
          const currentVariantPrice = selectedVariant.price;
          if (Math.abs(currentVariantPrice - item.productPrice) > 0.01) {
            // Update to current variant price if different
            orderItem.productPrice = currentVariantPrice;
            orderItem.totalPrice = currentVariantPrice * item.qty;
          }
        }
      } else {
        // For products without variants, ensure we have basic info
        orderItem.variantSku = null;
        orderItem.variantDetails = null;
      }
      
      return orderItem;
    });

    // Create order with enhanced validation
    const order = new Order({
      items: orderItems,
      totalPrice: Math.round(totalPrice * 100) / 100, // Ensure 2 decimal places
      totalItem,
      totalQty,
      discountAmt: 0,
      paymentMethod,
      paid: paymentMethod === 'cod' ? false : true,
      status: 'pending',
      shippingAddress: finalShippingAddress,
      user: new mongoose.Types.ObjectId(userId)
    });

    await order.save({ session });

    // Create cart-order relationships for available items
    const cartOrderDocs = availableItems.map(item => ({
      order: order._id,
      cart: item._id
    }));

    await CartOrder.insertMany(cartOrderDocs, { session });

    // Enhanced atomic stock deduction with mixed order support
    const stockUpdates = [];
    const stockDeductions = []; // Track for inventory logging
    
    for (const item of availableItems) {
      if (item.product.variants?.length > 0) {
        let targetVariant;
        
        // Use the same variant selection logic as order items
        if (item.variantSku) {
          targetVariant = item.product.variants.find(v => v.sku === item.variantSku);
        }
        if (!targetVariant) {
          targetVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
        }
        
        if (targetVariant) {
          const previousStock = targetVariant.stock;
          
          stockUpdates.push({
            updateOne: {
              filter: { 
                _id: item.product._id, 
                'variants._id': targetVariant._id,
                'variants.stock': { $gte: item.qty }
              },
              update: { 
                $inc: { 
                  'variants.$.stock': -item.qty,
                  'totalStock': -item.qty
                }
              }
            }
          });
          
          // Track for inventory logging
          stockDeductions.push({
            productId: item.product._id,
            productTitle: item.product.title,
            variantSku: targetVariant.sku,
            quantity: item.qty,
            previousStock,
            newStock: previousStock - item.qty
          });
        }
      }
    }
    
    // Execute bulk stock updates with enhanced error handling
    if (stockUpdates.length > 0) {
      const bulkResult = await Product.bulkWrite(stockUpdates, { session });
      
      if (bulkResult.modifiedCount !== stockUpdates.length) {
        await session.abortTransaction();
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Stock conflict detected. Some items may have been purchased by other customers. Please refresh your cart and try again.',
          conflictedItems: stockUpdates.length - bulkResult.modifiedCount
        });
      }
    }

    // Remove only the checked out items from cart
    const itemsToRemove = { user: new mongoose.Types.ObjectId(userId) };
    if (cartItemIds && cartItemIds.length > 0) {
      itemsToRemove._id = { $in: cartItemIds.map(id => new mongoose.Types.ObjectId(id)) };
    }
    await Cart.deleteMany(itemsToRemove, { session });
    
    // Commit transaction
    await session.commitTransaction();

    // Enhanced inventory logging for mixed order tracking
    try {
      const systemAdminId = process.env.SYSTEM_ADMIN_ID || null;
      
      // Log stock deductions for each item
      for (const deduction of stockDeductions) {
        try {
          await InventoryService.logMovement(
            deduction.productId,
            deduction.variantSku,
            'sale',
            deduction.quantity,
            deduction.previousStock,
            deduction.newStock,
            systemAdminId,
            order._id,
            `Stock deducted for order checkout - ${deduction.productTitle} (${deduction.variantSku})`
          );
        } catch (itemLogError) {
          console.error(`Failed to log stock deduction for ${deduction.productTitle}:`, itemLogError);
        }
      }
    } catch (logError) {
      console.error('Inventory logging failed:', logError);
      // Don't fail the order for logging errors
    }

    // Get user data for token and email (cached from earlier)
    const user = await User.findById(req.userInfo.userId).select('_id email fullname profileImage tokenVersion');
    
    // Keep user logged in by refreshing token
    const refreshedToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        fullName: user.fullname, 
        photo: user.profileImage, 
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '5d' }
    );

    // Send order confirmation email (non-blocking)
    setImmediate(async () => {
      try {
        await NotificationService.sendOrderConfirmation(user.email, {
          customerName: user.fullname,
          orderId: order._id,
          orderNumber: order._id.toString().slice(-8),
          orderDate: order.createdAt.toLocaleDateString(),
          totalPrice: order.totalPrice,
          totalItem: order.totalItem,
          paymentMethod: order.paymentMethod,
          items: order.items
        });
      } catch (emailError) {
        console.error('Order confirmation email failed:', emailError.message);
      }
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order._id,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        status: order.status,
        orderDate: order.createdAt,
        accessToken: refreshedToken // Refreshed session for continued shopping
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Checkout error:', error.message);
    
    // Determine appropriate error message
    let errorMessage = 'Checkout failed. Please try again.';
    if (error.message.includes('available')) {
      errorMessage = error.message;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid order data. Please check your information.';
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await session.endSession();
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.userInfo.userId;

    const orders = await Order.find({ user: userId })
      .populate('shippingAddress')
      .populate({
        path: 'items.productId',
        select: 'title price thumbnail images variants'
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'No orders found',
        data: []
      });
    }

    // Orders with complete status tracking and progress
    const ordersWithItems = orders.map(order => {
      // Calculate order progress
      const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
      const currentIndex = statusOrder.indexOf(order.status);
      const progress = order.status === 'cancelled' ? 0 : 
                      order.status === 'delivered' ? 100 : 
                      Math.max(0, (currentIndex + 1) * 25);
      
      // Enhance order items with variant information
      const enhancedItems = (order.items || []).map(item => {
        const enhancedItem = {
          ...item,
          product: item.productId ? {
            id: item.productId._id,
            title: item.productId.title || item.productTitle,
            price: item.productId.price,
            thumbnail: item.productId.thumbnail,
            images: item.productId.images
          } : null,
          orderedVariant: item.variantDetails || null
        };
        
        // Find current variant info if product still exists
        if (item.variantSku && item.productId?.variants) {
          const currentVariant = item.productId.variants.find(v => v.sku === item.variantSku);
          enhancedItem.currentVariant = currentVariant || null;
          enhancedItem.variantStillExists = !!currentVariant;
        } else {
          enhancedItem.currentVariant = null;
          enhancedItem.variantStillExists = false;
        }
        
        return enhancedItem;
      });
      
      return {
        orderId: order._id,
        totalPrice: order.totalPrice,
        totalItem: order.totalItem,
        totalQty: order.totalQty,
        paymentMethod: order.paymentMethod,
        paid: order.paid,
        status: order.status,
        statusHistory: order.statusHistory || [],
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        progress: progress,
        canCancel: ['pending', 'processing'].includes(order.status),
        items: enhancedItems,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Found ${orders.length} orders`,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('Get order history error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch order history'
    });
  }
};