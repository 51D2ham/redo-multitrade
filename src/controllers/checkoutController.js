const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const Cart = require('../models/cartModel');
const { Product } = require('../models/productModel');
const User = require('../models/userRegisterModel');
const { sendOrderConfirmation } = require('../utils/orderNotification');
const InventoryService = require('../services/inventoryService');

// Import models
const { Order, CartOrder } = require('../models/orderModel');
const ShippingAddress = require('../models/shippingAddressSchema');

exports.checkout = async (req, res) => {
  // Transaction/session removed for COD-only flow

  try {
    const userId = req.userInfo.userId;
    const { paymentMethod = 'cod', shippingAddress, useNewAddress = true, addressId, cartItemIds } = req.body;

    // Validate payment method
    if (!['cod', 'online', 'other'].includes(paymentMethod)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Get user's cart items (all or specific items for selective checkout)
    const cartQuery = { user: userId };
    if (cartItemIds && cartItemIds.length > 0) {
      cartQuery._id = { $in: cartItemIds };
    }
    
    const cartItems = await Cart.find(cartQuery)
      .populate({
        path: 'product',
        select: 'title price thumbnail images slug variants status',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    if (!cartItems || cartItems.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Cart is empty'
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
          if (targetVariant.status === 'out_of_stock' || targetVariant.qty === 0) {
            isAvailable = false;
            stockMessage = `${item.product.title} is currently out of stock`;
          } else if (targetVariant.qty < item.qty) {
            isAvailable = false;
            stockMessage = `Only ${targetVariant.qty} available for ${item.product.title}, but ${item.qty} in cart`;
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
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Cannot proceed to checkout. Some items are out of stock.',
        outOfStockItems,
        suggestion: 'Please update your cart and try again'
      });
    }

    // Handle shipping address
    let finalShippingAddress;
    
    if (useNewAddress) {
      if (!shippingAddress) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Shipping address is required'
        });
      }

      const requiredFields = ['fullname', 'street', 'city', 'state', 'postalCode', 'country', 'phone'];
      const missingFields = requiredFields.filter(field => !shippingAddress[field]);

      if (missingFields.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Create new shipping address
      const newAddress = new ShippingAddress({
        ...shippingAddress,
        user: userId
      });
  await newAddress.save();
      finalShippingAddress = newAddress._id;
    } else {
      if (!addressId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Address ID is required when using saved address'
        });
      }

      const existingAddress = await ShippingAddress.findOne({
        _id: addressId,
        user: userId
  });

      if (!existingAddress) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Shipping address not found'
        });
      }
      finalShippingAddress = addressId;
    }

    // Calculate totals from available items only
    const totalPrice = availableItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItem = availableItems.length;
    const totalQty = availableItems.reduce((sum, item) => sum + item.qty, 0);

    // Create order items with product details and variant info
    const orderItems = availableItems.map(item => {
      const orderItem = {
        productId: item.product._id,
        productTitle: item.product.title,
        productPrice: item.productPrice,
        qty: item.qty,
        totalPrice: item.totalPrice
      };
      
      // Handle variant info for products with variants
      if (item.product.variants && item.product.variants.length > 0) {
        let selectedVariant = null;
        
        // Try to find the variant from cart first
        if (item.variantSku) {
          selectedVariant = item.product.variants.find(v => v.sku === item.variantSku);
        }
        
        // If no variant found in cart, FORCE use default variant
        if (!selectedVariant) {
          selectedVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
        }
        
        // ALWAYS save variant info to order for products with variants
        if (selectedVariant) {
          orderItem.variantSku = selectedVariant.sku;
          orderItem.variantDetails = {
            color: selectedVariant.color || 'Standard',
            size: selectedVariant.size || 'Default',
            material: selectedVariant.material || 'Standard',
            weight: selectedVariant.weight || 0,
            dimensions: selectedVariant.dimensions || { length: 0, width: 0, height: 0 }
          };
          
          // Use the actual variant price instead of cart price if different
          const variantPrice = selectedVariant.discountPrice || selectedVariant.price;
          if (variantPrice !== item.productPrice) {
            orderItem.productPrice = variantPrice;
            orderItem.totalPrice = variantPrice * item.qty;
          }
        }
      }
      
      return orderItem;
    });

    // Create order
    const order = new Order({
      items: orderItems,
      totalPrice,
      totalItem,
      totalQty,
      discountAmt: 0,
      paymentMethod,
      paid: paymentMethod === 'cod' ? false : true, // COD is unpaid initially
      status: 'pending',
      shippingAddress: finalShippingAddress,
      user: userId
    });

  await order.save();

    // Create cart-order relationships for available items
    const cartOrderDocs = availableItems.map(item => ({
      order: order._id,
      cart: item._id
    }));

  await CartOrder.insertMany(cartOrderDocs);

    // Atomic stock deduction with race condition protection
    for (const item of availableItems) {
      if (item.product.variants?.length > 0) {
        let targetVariant;
        if (item.variantSku) {
          targetVariant = item.product.variants.find(v => v.sku === item.variantSku);
        }
        if (!targetVariant) {
          targetVariant = item.product.variants.find(v => v.isDefault) || item.product.variants[0];
        }
        
        if (targetVariant) {
          const result = await Product.updateOne(
            { 
              _id: item.product._id, 
              'variants._id': targetVariant._id,
              'variants.qty': { $gte: item.qty }
            },
            { $inc: { 'variants.$.qty': -item.qty } }
          );
          
          if (result.modifiedCount === 0) {
            throw new Error(`${item.product.title} variant ${targetVariant.sku} is no longer available in requested quantity`);
          }
        }
      }
    }

    // Remove only the checked out items from cart
    const itemsToRemove = { user: userId };
    if (cartItemIds && cartItemIds.length > 0) {
      itemsToRemove._id = { $in: cartItemIds };
    }
  await Cart.deleteMany(itemsToRemove);

    // Log inventory movements (after successful transaction)
    try {
      // Use a valid admin ObjectId for system actions, or fallback to null
      const systemAdminId = process.env.SYSTEM_ADMIN_ID || null;
      await InventoryService.logSale(orderItems, order._id, systemAdminId);
    } catch (logError) {
      console.error('Inventory logging failed:', logError);
      // Don't fail the order for logging errors
    }

    // Keep user logged in by refreshing token (no logout after checkout)
    const jwt = require('jsonwebtoken');
    const user = await User.findById(req.userInfo.userId);
    const refreshedToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        fullName: user.fullname, 
        photo: user.profileImage, 
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '5d' } // Fresh 5-day token - user stays logged in
    );

    // Send order confirmation email (non-blocking)
    try {
      const NotificationService = require('../services/notificationService');
      const user = await User.findById(req.userInfo.userId);
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
      console.error('Email notification failed:', emailError);
    }

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
    console.error('Checkout error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Checkout failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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