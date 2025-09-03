const { Order } = require('../models/orderModel');
const User = require('../models/userRegisterModel');
const ShippingAddress = require('../models/shippingAddressSchema');
const { sendOrderStatusUpdate } = require('../utils/orderNotification');
const { Parser } = require('json2csv');
const { StatusCodes } = require('http-status-codes');
const MixedOrderStockService = require('../services/mixedOrderStockService');
const MixedOrderReportingService = require('../services/mixedOrderReportingService');

// Status transition validation - Enhanced with better logic
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!allowedStatuses.includes(newStatus)) {
    console.log('Invalid status:', newStatus);
    return false;
  }

  // If current status is a final state, don't allow changing away from it
  if (['delivered', 'cancelled'].includes(currentStatus) && currentStatus !== newStatus) {
    console.log('Cannot change from final state:', currentStatus, 'to', newStatus);
    return false;
  }

  // Otherwise allow the change (administrators can control the flow from UI)
  return true;
};

// ======================
// PUBLIC API CONTROLLERS
// ======================

exports.getAllPublicOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'cancelled' } })
      .select('_id status createdAt totalPrice')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getPublicOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('_id status createdAt totalPrice items')
      .populate('items.productId', 'title images variants');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ trackingNumber: req.params.trackingNumber })
      .select('_id status statusHistory trackingNumber estimatedDelivery');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with this tracking number'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ========================
// ADMIN DASHBOARD CONTROLLERS
// ========================

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, search, dateFrom, dateTo, sortBy = 'priority' } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { 'items.productTitle': { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
      
      // Handle ObjectId search (both full and partial)
      const cleanSearch = search.startsWith('#') ? search.substring(1) : search;
      if (cleanSearch.match(/^[0-9a-fA-F]{8,24}$/)) {
        if (cleanSearch.length === 24) {
          // Full ObjectId - exact match
          try {
            const mongoose = require('mongoose');
            filter.$or.push({ _id: new mongoose.Types.ObjectId(cleanSearch) });
          } catch (e) {
            // Invalid ObjectId, skip
          }
        } else {
          // Partial ObjectId - use string conversion for regex
          filter.$or.push({
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: cleanSearch,
                options: 'i'
              }
            }
          });
        }
      }
      
      // Add user search
      try {
        const userFilter = await User.find({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { fullname: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        if (userFilter.length > 0) {
          filter.$or.push({ user: { $in: userFilter.map(u => u._id) } });
        }
      } catch (userSearchError) {
        console.log('User search failed:', userSearchError.message);
      }
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);
    const currentPage = Math.max(1, parseInt(page));

    // Custom sorting logic
    let sortQuery = {};
    if (sortBy === 'priority') {
      // Priority sort: pending/processing first, then shipped, delivered last
      sortQuery = {
        status: 1, // This will be overridden by aggregation
        createdAt: -1
      };
    } else if (sortBy === 'date_desc') {
      sortQuery = { createdAt: -1 };
    } else if (sortBy === 'date_asc') {
      sortQuery = { createdAt: 1 };
    } else if (sortBy === 'amount_desc') {
      sortQuery = { totalPrice: -1 };
    } else if (sortBy === 'amount_asc') {
      sortQuery = { totalPrice: 1 };
    }

    // Get all orders first, then sort in memory for priority
    let orders;
    if (sortBy === 'priority') {
      orders = await Order.find(filter)
        .populate('user', 'username fullname email phone')
        .populate('shippingAddress')
        .lean();
      
      // Sort by priority in memory
      orders.sort((a, b) => {
        const statusPriority = {
          'pending': 1,
          'processing': 2, 
          'shipped': 3,
          'cancelled': 4,
          'delivered': 5
        };
        
        const aPriority = statusPriority[a.status] || 6;
        const bPriority = statusPriority[b.status] || 6;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Secondary sort by date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      // Apply pagination after sorting
      const startIndex = (currentPage - 1) * limit;
      orders = orders.slice(startIndex, startIndex + Number(limit));
    } else {
      orders = await Order.find(filter)
        .populate('user', 'username fullname email phone')
        .populate('shippingAddress')
        .sort(sortQuery)
        .skip((currentPage - 1) * limit)
        .limit(Number(limit))
        .lean();
    }

    res.render('orders/list', {
      title: 'Order Management',
      orders,
      currentPage,
      totalPages,
      totalOrders,
      filters: req.query,
      limit: Number(limit),
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Fetch orders error:', err);
    req.flash('error', 'Failed to load orders');
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('orders/list', {
      title: 'Order Management',
      orders: [],
      currentPage: 1,
      totalPages: 0,
      totalOrders: 0,
      filters: {},
      limit: 10,
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('user', 'username fullname email phone')
      .populate('shippingAddress')
      .populate({
        path: 'items.productId',
        select: 'title price thumbnail images variants brand category description warranty tags',
        populate: [
          { path: 'brand', select: 'name' },
          { path: 'category', select: 'name' }
        ]
      })
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Enhance items with product details and variant information
    if (order.items?.length > 0) {
      order.items = order.items.map(item => {
        const enhancedItem = {
          ...item,
          productImage: item.productId?.images?.[0] ? `/uploads/products/${item.productId.images[0]}` : null,
          brand: item.productId?.brand?.name || 'Unknown Brand',
          category: item.productId?.category?.name || 'Unknown Category',
          variants: item.productId?.variants || []
        };
        
        // Find and attach the specific ordered variant details
        if (item.variantSku && item.productId?.variants) {
          const orderedVariant = item.productId.variants.find(v => v.sku === item.variantSku);
          if (orderedVariant) {
            enhancedItem.orderedVariant = orderedVariant;
            if (!item.variantDetails || Object.keys(item.variantDetails).length === 0) {
              enhancedItem.variantDetails = {
                color: orderedVariant.color,
                size: orderedVariant.size,
                material: orderedVariant.material,
                weight: orderedVariant.weight,
                dimensions: orderedVariant.dimensions
              };
            }
          }
        } else if (!item.variantSku && item.productId?.variants?.length > 0) {
          const defaultVariant = item.productId.variants.find(v => v.isDefault) || item.productId.variants[0];
          if (defaultVariant) {
            enhancedItem.variantSku = defaultVariant.sku;
            enhancedItem.variantDetails = {
              color: defaultVariant.color,
              size: defaultVariant.size,
              material: defaultVariant.material,
              weight: defaultVariant.weight,
              dimensions: defaultVariant.dimensions
            };
            enhancedItem.orderedVariant = defaultVariant;
          }
        }
        
        return enhancedItem;
      });
    }

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Get product specifications for each item
    if (order?.items) {
      const { ProductSpecs } = require('../models/productModel');
      
      for (let item of order.items) {
        if (item.productId) {
          try {
            const specs = await ProductSpecs.find({ product: item.productId._id })
              .populate('specList', 'title')
              .lean();
            item.specifications = specs;
          } catch (err) {
            console.log('Could not fetch specs for product:', item.productId._id);
            item.specifications = [];
          }
        }
      }
    }

    // Enhance items with product details and variant information (final processing)
    if (order.items?.length > 0) {
      order.items = order.items.map(item => {
        const enhancedItem = {
          ...item,
          productImage: item.productId?.images?.[0] ? `/uploads/products/${item.productId.images[0]}` : null,
          brand: item.productId?.brand?.name || 'Unknown Brand',
          category: item.productId?.category?.name || 'Unknown Category',
          variants: item.productId?.variants || []
        };
        
        // Find and attach the specific ordered variant details
        if (item.variantSku && item.productId?.variants) {
          const orderedVariant = item.productId.variants.find(v => v.sku === item.variantSku);
          if (orderedVariant) {
            enhancedItem.orderedVariant = orderedVariant;
            if (!item.variantDetails || Object.keys(item.variantDetails).length === 0) {
              enhancedItem.variantDetails = {
                color: orderedVariant.color,
                size: orderedVariant.size,
                material: orderedVariant.material,
                weight: orderedVariant.weight,
                dimensions: orderedVariant.dimensions
              };
            }
          }
        } else if (!item.variantSku && item.productId?.variants?.length > 0) {
          const defaultVariant = item.productId.variants.find(v => v.isDefault) || item.productId.variants[0];
          if (defaultVariant) {
            enhancedItem.variantSku = defaultVariant.sku;
            enhancedItem.variantDetails = {
              color: defaultVariant.color,
              size: defaultVariant.size,
              material: defaultVariant.material,
              weight: defaultVariant.weight,
              dimensions: defaultVariant.dimensions
            };
            enhancedItem.orderedVariant = defaultVariant;
          }
        }
        
        return enhancedItem;
      });
    } else {
      // Fallback for orders without items
      order.items = [{
        productId: 'unknown',
        productTitle: `Order Total (${order.totalItem || 0} items)`,
        productPrice: Math.round(order.totalPrice / (order.totalQty || 1)),
        productImage: null,
        brand: 'N/A',
        category: 'N/A',
        variants: [],
        qty: order.totalQty || 1,
        totalPrice: order.totalPrice
      }];
    }

    // Ensure statusHistory exists
    order.statusHistory = order.statusHistory || [];

    res.render('orders/show', { 
      title: 'Order Details',
      order,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Get order error:', err);
    req.flash('error', 'Failed to load order details');
    res.redirect('/admin/v1/order');
  }
};

exports.newOrder = (req, res) => {
  res.render('orders/new', {
    title: 'Create New Order',
    success: req.flash('success'),
    error: req.flash('error')
  });
};

exports.createOrder = async (req, res) => {
  try {
    // Implementation for manual order creation
    req.flash('success', 'Order created successfully');
    res.redirect('/admin/v1/order');
  } catch (error) {
    console.error('Create order error:', error);
    req.flash('error', 'Error: ' + error.message);
    res.redirect('/admin/v1/order/new');
  }
};

exports.renderEditOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('user', 'username fullname email phone')
      .populate('shippingAddress')
      .populate({
        path: 'items.productId',
        select: 'title price thumbnail images variants brand category description warranty tags',
        populate: [
          { path: 'brand', select: 'name' },
          { path: 'category', select: 'name' }
        ]
      })
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Preprocess complex data to avoid EJS parsing errors
    const orderNumber = order._id.toString().slice(-8).toUpperCase();
    const formattedTotal = (order.totalPrice || 0).toLocaleString();
    const itemCount = (order.items?.length || 0);
    const statusDisplay = (order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1);
    const trackingNumber = order.trackingNumber || '';
    const orderStatus = order.status || 'pending';
    const paidStatus = order.paid ? 'true' : 'false';
    const orderItemsJson = JSON.stringify(order.items || []);

    // Process items to eliminate complex EJS expressions
    const processedItems = [];
    if (order.items?.length > 0) {
      order.items.forEach((item, index) => {
        const imageUrl = item.productId?.images?.[0] ? `/uploads/products/${item.productId.images[0]}` : null;
        const title = item.productTitle || 'Unknown Product';
        const price = (item.productPrice || 0).toLocaleString();
        const qty = item.qty || 1;
        const priceDisplay = `₹${price} × ${qty}`;
        const status = item.status || 'pending';
        const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
        const canUpdate = status !== 'cancelled' && status !== 'delivered';
        
        processedItems.push({
          imageUrl,
          title,
          priceDisplay,
          statusDisplay,
          canUpdate,
          originalItem: item
        });
      });
    }

    res.render('orders/edit', { 
      title: 'Edit Order',
      order,
      orderNumber,
      formattedTotal,
      itemCount,
      statusDisplay,
      trackingNumber,
      orderStatus,
      paidStatus,
      orderItemsJson,
      processedItems,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Edit order error:', err);
    req.flash('error', 'Failed to load order');
    res.redirect('/admin/v1/order');
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
  const { status, paid, trackingNumber, estimatedDelivery, statusMessage } = req.body;
  // items may be posted as an object/array of item updates
  const postedItems = req.body.items;

    const order = await Order.findById(id).populate('user', 'email fullname');
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Prevent changing status away from final states (delivered/cancelled),
    // but allow updating other fields (tracking, payment, messages) for audit/fixes.
    if (['delivered', 'cancelled'].includes(order.status)) {
      if (status && status !== order.status) {
        req.flash('error', `Cannot change status from ${order.status} to ${status}`);
        return res.redirect(`/admin/v1/order/${id}`);
      }
      // allow other non-status updates to proceed
    }

    let statusChanged = false;
    
    // Handle status change
    if (status && status !== order.status) {
      // Validate status transition
      if (!validateStatusTransition(order.status, status)) {
        req.flash('error', `Cannot change status from ${order.status} to ${status}`);
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      
      // Additional validation based on item statuses
      const itemStatuses = order.items.map(item => item.status || 'pending');
      const allCancelled = itemStatuses.every(s => s === 'cancelled');
      const allDelivered = itemStatuses.filter(s => s !== 'cancelled').every(s => s === 'delivered');
      const hasProcessing = itemStatuses.some(s => s === 'processing');
      const hasShipped = itemStatuses.some(s => s === 'shipped');
      const hasPending = itemStatuses.some(s => s === 'pending');
      
      // Prevent invalid status changes
      if (status === 'cancelled' && !allCancelled) {
        req.flash('error', 'Cannot mark order as cancelled - not all items are cancelled');
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      if (status === 'delivered' && !allDelivered) {
        req.flash('error', 'Cannot mark order as delivered - not all active items are delivered');
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      if (status === 'pending' && !hasPending) {
        req.flash('error', 'Cannot mark order as pending - no items are pending');
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      if (status === 'processing' && !hasProcessing && !hasPending) {
        req.flash('error', 'Cannot mark order as processing - no items are processing or pending');
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      if (status === 'shipped' && !hasShipped && !hasProcessing && !hasPending) {
        req.flash('error', 'Cannot mark order as shipped - no items are shipped, processing, or pending');
        return res.redirect(`/admin/v1/order/${id}/edit`);
      }
      
      const oldStatus = order.status;
      
      // Enhanced stock handling for mixed orders
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        try {
          const stockResult = await MixedOrderStockService.handleMixedOrderStock(
            order,
            req.session?.admin?.id
          );
          
          if (!stockResult.success) {
            console.warn('Mixed order stock handling errors:', stockResult.errors.join(', '));
            req.flash('error', 'Failed to handle stock during cancellation: ' + stockResult.errors.join(', '));
            return res.redirect(`/admin/v1/order/${id}/edit`);
          }
        } catch (stockError) {
          console.warn('Mixed order stock handling failed:', stockError.message);
          req.flash('error', 'Failed to handle stock during cancellation');
          return res.redirect(`/admin/v1/order/${id}/edit`);
        }
      }
      
      order.status = status;
      statusChanged = true;
      
      // Add to status history
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: status,
        message: statusMessage || `Order status updated from ${oldStatus} to ${status}`,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    // Handle per-item status updates if provided
    if (postedItems && Array.isArray(postedItems)) {
      const StockManager = require('../utils/stockManager');
      for (const pItem of postedItems) {
        try {
          const idx = Number(pItem.index);
          if (isNaN(idx) || !order.items[idx]) continue;
          const existingItem = order.items[idx];
          const newItemStatus = String(pItem.status || existingItem.status || '').toLowerCase();
          if (newItemStatus && newItemStatus !== existingItem.status) {
            // Validate status
            const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!allowed.includes(newItemStatus)) continue;

            // If item is being cancelled, restore its stock
            if (newItemStatus === 'cancelled' && existingItem.status !== 'cancelled') {
              try {
                const restoreResult = await StockManager.restoreStock([existingItem], id, req.session?.admin?.id);
                if (!restoreResult.success) {
                  console.warn('Item stock restoration errors:', restoreResult.errors.map(e => sanitizeInput(e)).join(', '));
                  req.flash('error', 'Some item stock restorations failed: ' + restoreResult.errors.join(', '));
                }
              } catch (e) {
                console.warn('Item stock restoration failed:', sanitizeInput(e.message));
                req.flash('error', 'Failed to restore stock for cancelled item');
              }
            }

            // Record sales for delivered items
            if (newItemStatus === 'delivered' && existingItem.status !== 'delivered') {
              try {
                const SalesService = require('../services/salesService');
                const salesResult = await SalesService.recordSalesForDeliveredItems(id, req.session?.admin?.id);
                if (!salesResult.success) {
                  console.error('Sales recording failed:', salesResult.error);
                }
              } catch (salesError) {
                console.error('Sales recording failed:', salesError);
              }
            }

            // Remove sales record if item is cancelled
            if (newItemStatus === 'cancelled' && existingItem.status !== 'cancelled') {
              try {
                const SalesService = require('../services/salesService');
                const removalResult = await SalesService.removeSalesForCancelledItems(id, existingItem.productId, existingItem.variantSku);
                if (!removalResult.success) {
                  console.error('Sales removal failed:', removalResult.error);
                }
              } catch (salesError) {
                console.error('Sales removal failed:', salesError);
              }
            }

            // push item-level status history
            if (!existingItem.statusHistory) existingItem.statusHistory = [];
            existingItem.statusHistory.push({ status: newItemStatus, message: pItem.statusMessage || `Item status changed to ${newItemStatus}`, updatedBy: req.session?.admin?.id, updatedAt: new Date() });

            existingItem.status = newItemStatus;
          }
        } catch (itemErr) {
          console.error('Error processing posted item update:', itemErr);
        }
      }
    }

    // Handle payment status
    if (paid !== undefined) {
      order.paid = paid === 'true' || paid === true;
    }

    // Auto-update payment for delivered COD orders
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paid = true;
    }

    // Update other fields
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    // Recalculate order status based on item statuses after updates
    const newCalculatedStatus = calculateOrderStatus(order.items);
    if (newCalculatedStatus !== order.status && validateStatusTransition(order.status, newCalculatedStatus)) {
      order.status = newCalculatedStatus;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: newCalculatedStatus,
        message: `Order auto-updated to ${newCalculatedStatus} based on item statuses`,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    await order.save();

    // Send email notification if status changed
    if (statusChanged && order.user?.email) {
      try {
        await sendOrderStatusUpdate(order.user.email, order, status, statusMessage);
      } catch (emailError) {
        console.error('Status update email failed:', emailError);
      }
    }

    req.flash('success', 'Order updated successfully');
    res.redirect(`/admin/v1/order/${id}`);
  } catch (err) {
    console.error('Update order error:', err);
    req.flash('error', 'Failed to update order: ' + err.message);
    res.redirect(`/admin/v1/order/${req.params.id}/edit`);
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Only allow deletion of cancelled orders
    if (order.status !== 'cancelled') {
      req.flash('error', 'Only cancelled orders can be deleted');
      return res.redirect(`/admin/v1/order/${req.params.id}`);
    }

    await Order.findByIdAndDelete(req.params.id);
    req.flash('success', 'Order deleted successfully');
    res.redirect('/admin/v1/order');
  } catch (error) {
    req.flash('error', 'Error deleting order: ' + error.message);
    res.redirect(`/admin/v1/order/${req.params.id}`);
  }
};

// Get item status history
exports.getItemStatusHistory = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    
    const order = await Order.findById(id)
      .populate('items.statusHistory.updatedBy', 'username fullname')
      .lean();
      
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const itemIdx = parseInt(itemIndex);
    if (isNaN(itemIdx) || !order.items[itemIdx]) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const item = order.items[itemIdx];
    const statusHistory = item.statusHistory || [];

    res.json({ 
      success: true, 
      data: {
        productTitle: item.productTitle,
        currentStatus: item.status,
        statusHistory: statusHistory.map(h => ({
          status: h.status,
          message: h.message,
          updatedBy: h.updatedBy?.fullname || h.updatedBy?.username || 'System',
          updatedAt: h.updatedAt
        }))
      }
    });
  } catch (err) {
    console.error('Get item status history error:', err);
    res.status(500).json({ success: false, message: 'Failed to get item status history' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusMessage, sendEmail } = req.body;

    const order = await Order.findById(id).populate('user', 'email fullname');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate status transition
    if (!validateStatusTransition(order.status, status)) {
      const errorMsg = `Cannot change status from ${order.status} to ${status}`;
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash('error', errorMsg);
      return res.redirect(`/admin/v1/order/${id}`);
    }

    const oldStatus = order.status;
    
    // Handle stock restoration for cancellation
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const StockManager = require('../utils/stockManager');
      try {
        const restoreResult = await StockManager.restoreStock(
          order.items,
          id,
          req.session?.admin?.id
        );
        
        if (!restoreResult.success) {
          console.error('Stock restoration errors:', restoreResult.errors);
          const errorMsg = 'Failed to restore stock: ' + restoreResult.errors.join(', ');
          if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: errorMsg });
          }
          req.flash('error', errorMsg);
          return res.redirect(`/admin/v1/order/${id}`);
        }
      } catch (restockError) {
        console.error('Stock restoration failed:', restockError);
        const errorMsg = 'Failed to restore stock during cancellation';
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(500).json({ success: false, message: errorMsg });
        }
        req.flash('error', errorMsg);
        return res.redirect(`/admin/v1/order/${id}`);
      }
    }
    
    order.status = status;

    // Update all items to match order status
    if (order.items) {
      order.items.forEach(item => {
        if (!['delivered', 'cancelled'].includes(item.status || 'pending')) {
          item.status = status;
          if (!item.statusHistory) item.statusHistory = [];
          item.statusHistory.push({
            status: status,
            message: `Auto-updated with order to ${status}`,
            updatedBy: req.session?.admin?.id,
            updatedAt: new Date()
          });
        }
      });
    }

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: status,
      message: statusMessage || `Order ${status}`,
      updatedBy: req.session?.admin?.id,
      updatedAt: new Date()
    });

    // Auto-update payment for delivered COD orders
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paid = true;
    }

    await order.save();

    // Send email notification
    if (sendEmail && order.user?.email) {
      try {
        await sendOrderStatusUpdate(order.user.email, order, status, statusMessage);
      } catch (emailError) {
        console.error('Status update email failed:', emailError);
      }
    }

    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: 'Order updated successfully', 
        status,
        paid: order.paid
      });
    }

    req.flash('success', 'Order status updated successfully');
    res.redirect(`/admin/v1/order/${id}`);
  } catch (err) {
    console.error('Update status error:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Failed to update status' });
    }
    req.flash('error', 'Failed to update order status');
    res.redirect(`/admin/v1/order/${req.params.id}`);
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Prevent payment changes for cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update payment for cancelled orders' 
      });
    }

    const oldPaid = order.paid;
    order.paid = paid === true || paid === 'true';

    // Add to status history if payment changed
    if (order.paid !== oldPaid) {
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: order.status,
        message: `Payment status updated to ${order.paid ? 'Paid' : 'Unpaid'}`,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    await order.save();

    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ success: true, message: 'Payment status updated', paid: order.paid });
    }

    req.flash('success', 'Payment status updated successfully');
    res.redirect(`/admin/v1/order/${id}`);
  } catch (err) {
    console.error('Update payment error:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Failed to update payment' });
    }
    req.flash('error', 'Failed to update payment status');
    res.redirect(`/admin/v1/order/${req.params.id}`);
  }
};

// Calculate optimal order status based on item statuses
const calculateOrderStatus = (items) => {
  if (!items || items.length === 0) return 'pending';
  
  const statuses = items.map(item => item.status || 'pending');
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const total = items.length;
  const delivered = statusCounts.delivered || 0;
  const cancelled = statusCounts.cancelled || 0;
  const shipped = statusCounts.shipped || 0;
  const processing = statusCounts.processing || 0;
  const pending = statusCounts.pending || 0;
  
  // All items cancelled = order cancelled
  if (cancelled === total) return 'cancelled';
  
  // All non-cancelled items delivered = order delivered
  if (delivered + cancelled === total && delivered > 0) return 'delivered';
  
  // Mixed delivery status: partially delivered
  if (delivered > 0 && (pending > 0 || processing > 0 || shipped > 0)) {
    // If some items are delivered but others are still in progress
    if (shipped > 0) return 'shipped'; // Prioritize shipped status
    if (processing > 0) return 'processing';
    return 'processing'; // Default for mixed active states
  }
  
  // Any item shipped (and none pending/processing) = order shipped
  if (shipped > 0 && pending === 0 && processing === 0) return 'shipped';
  
  // Any item processing = order processing
  if (processing > 0) return 'processing';
  
  // Mixed states with shipping = shipped
  if (shipped > 0) return 'shipped';
  
  // Default to pending
  return 'pending';
};

// Update individual order item
exports.updateOrderItem = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const { status, statusMessage, sendEmail } = req.body;

    const order = await Order.findById(id).populate('user', 'email fullname');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const itemIdx = parseInt(itemIndex);
    if (isNaN(itemIdx) || !order.items[itemIdx]) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const item = order.items[itemIdx];
    const oldStatus = item.status || 'pending';

    // Validate status
    const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Prevent changing from final states
    if (['delivered', 'cancelled'].includes(oldStatus) && oldStatus !== status) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot change item status from ${oldStatus} to ${status}` 
      });
    }

    // Handle stock restoration for cancellation
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const StockManager = require('../utils/stockManager');
      try {
        const restoreResult = await StockManager.restoreStock([item], id, req.session?.admin?.id);
        if (!restoreResult.success) {
          return res.status(400).json({ 
            success: false, 
            message: 'Failed to restore stock: ' + restoreResult.errors.join(', ')
          });
        }
      } catch (restockError) {
        console.error('Stock restoration failed:', restockError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to restore stock during cancellation' 
        });
      }
    }

    // Update item status
    item.status = status;
    
    // Add to item status history
    if (!item.statusHistory) item.statusHistory = [];
    item.statusHistory.push({
      status: status,
      message: statusMessage || `Item ${status}`,
      updatedBy: req.session?.admin?.id,
      updatedAt: new Date()
    });
    
    // Handle sales recording for delivered items
    if (status === 'delivered' && oldStatus !== 'delivered') {
      try {
        const SalesService = require('../services/salesService');
        const salesResult = await SalesService.recordSalesForDeliveredItems(id, req.session?.admin?.id);
        if (!salesResult.success) {
          console.error('Sales recording failed:', salesResult.error);
        }
      } catch (salesError) {
        console.error('Sales recording failed:', salesError);
      }
    }
    
    // Remove sales record if item is cancelled
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      try {
        const SalesService = require('../services/salesService');
        const removalResult = await SalesService.removeSalesForCancelledItems(id, item.productId, item.variantSku);
        if (!removalResult.success) {
          console.error('Sales removal failed:', removalResult.error);
        }
      } catch (salesError) {
        console.error('Sales removal failed:', salesError);
      }
    }

    // Calculate new order status based on all items
    const newOrderStatus = calculateOrderStatus(order.items);
    const oldOrderStatus = order.status;
    
    if (newOrderStatus !== oldOrderStatus && validateStatusTransition(oldOrderStatus, newOrderStatus)) {
      order.status = newOrderStatus;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: newOrderStatus,
        message: `Order auto-updated to ${newOrderStatus} based on item statuses`,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    await order.save();

    // Send email notification if requested
    if (sendEmail && order.user?.email) {
      try {
        const { sendItemStatusUpdate } = require('../utils/orderNotification');
        await sendItemStatusUpdate(order.user.email, order, item, status, statusMessage);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    res.json({ 
      success: true, 
      message: 'Item updated successfully',
      itemStatus: status,
      orderStatus: order.status
    });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ success: false, message: 'Failed to update item status' });
  }
};

// Bulk update multiple items
exports.bulkUpdateItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, sendEmail } = req.body;

    const order = await Order.findById(id).populate('user', 'email fullname');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const StockManager = require('../utils/stockManager');
    const updatedItems = [];
    const errors = [];
    const oldOrderStatus = order.status;

    for (const itemUpdate of items) {
      try {
        const { index, status, statusMessage } = itemUpdate;
        const itemIdx = parseInt(index);
        
        if (isNaN(itemIdx) || !order.items[itemIdx]) {
          errors.push(`Invalid item index: ${index}`);
          continue;
        }

        const item = order.items[itemIdx];
        const oldStatus = item.status || 'pending';

        const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!allowed.includes(status)) {
          errors.push(`Invalid status for item ${index}: ${status}`);
          continue;
        }

        if (oldStatus === status) continue;

        if (['delivered', 'cancelled'].includes(oldStatus)) {
          errors.push(`Cannot change item ${index} from ${oldStatus}`);
          continue;
        }

        if (status === 'cancelled' && oldStatus !== 'cancelled') {
          try {
            const restoreResult = await StockManager.restoreStock([item], id, req.session?.admin?.id);
            if (!restoreResult.success) {
              errors.push(`Failed to restore stock for item ${index}`);
              continue;
            }
          } catch (restockError) {
            errors.push(`Stock restoration failed for item ${index}`);
            continue;
          }
        }

        item.status = status;
        
        if (!item.statusHistory) item.statusHistory = [];
        item.statusHistory.push({
          status: status,
          message: statusMessage || `Bulk updated to ${status}`,
          updatedBy: req.session?.admin?.id,
          updatedAt: new Date()
        });

        updatedItems.push({ index: itemIdx, oldStatus, newStatus: status, item });
      } catch (itemError) {
        errors.push(`Error updating item ${itemUpdate.index}`);
      }
    }

    // Calculate new order status based on all items
    const newOrderStatus = calculateOrderStatus(order.items);
    
    if (newOrderStatus !== oldOrderStatus && validateStatusTransition(oldOrderStatus, newOrderStatus)) {
      order.status = newOrderStatus;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: newOrderStatus,
        message: `Order auto-updated to ${newOrderStatus} after bulk item updates`,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    await order.save();

    // Send bulk email notification
    if (sendEmail && order.user?.email && updatedItems.length > 0) {
      try {
        const { sendBulkStatusUpdate } = require('../utils/orderNotification');
        await sendBulkStatusUpdate(order.user.email, order, updatedItems);
      } catch (emailError) {
        console.error('Bulk email notification failed:', emailError);
      }
    }

    res.json({ 
      success: errors.length === 0,
      message: `Updated ${updatedItems.length} items successfully`,
      updatedItems,
      errors,
      orderStatus: order.status
    });
  } catch (err) {
    console.error('Bulk update items error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk update items' });
  }
};

// API endpoint for recent orders (for notifications)
exports.getRecentOrders = async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(parseInt(since)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const orders = await Order.find({
      createdAt: { $gte: sinceDate },
      status: { $ne: 'cancelled' }
    })
    .populate('user', 'fullname email')
    .select('_id totalPrice totalItem items createdAt user')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    res.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders',
      orders: []
    });
  }
};

exports.exportOrdersCSV = async (req, res) => {
  try {
    const { status, paymentMethod, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { 'items.productTitle': { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
      
      // Handle ObjectId search (exact match only)
      const cleanSearch = search.startsWith('#') ? search.substring(1) : search;
      if (cleanSearch.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          const mongoose = require('mongoose');
          filter.$or.push({ _id: new mongoose.Types.ObjectId(cleanSearch) });
        } catch (e) {
          // Invalid ObjectId, skip
        }
      }
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(filter)
      .populate('user', 'username fullname email phone')
      .populate('shippingAddress')
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map(order => ({
      OrderID: order._id.toString(),
      CustomerName: order.user?.fullname || order.user?.username || 'Guest',
      CustomerEmail: order.user?.email || 'N/A',
      CustomerPhone: order.user?.phone || 'N/A',
      ShippingName: order.shippingAddress?.fullname || 'N/A',
      ShippingPhone: order.shippingAddress?.phone || 'N/A',
      TotalItems: order.totalItem || 0,
      TotalQuantity: order.totalQty || 0,
      TotalPrice: order.totalPrice || 0,
      Status: order.status || 'pending',
      PaymentMethod: order.paymentMethod || 'cod',
      Paid: order.paid ? 'Yes' : 'No',
      TrackingNumber: order.trackingNumber || 'N/A',
      CreatedAt: order.createdAt ? new Date(order.createdAt).toISOString() : 'N/A',
      Products: order.items?.map(item => item.productTitle).join('; ') || 'N/A',
      Quantities: order.items?.map(item => item.qty).join('; ') || 'N/A',
      Prices: order.items?.map(item => `₹${item.productPrice}`).join('; ') || 'N/A',
      VariantSKUs: order.items?.map(item => item.variantSku || 'No Variant').join('; ') || 'N/A',
      VariantColors: order.items?.map(item => item.variantDetails?.color || 'N/A').join('; ') || 'N/A',
      VariantSizes: order.items?.map(item => item.variantDetails?.size || 'N/A').join('; ') || 'N/A',
      VariantMaterials: order.items?.map(item => item.variantDetails?.material || 'N/A').join('; ') || 'N/A',
      VariantWeights: order.items?.map(item => item.variantDetails?.weight ? `${item.variantDetails.weight}g` : 'N/A').join('; ') || 'N/A',
      VariantDimensions: order.items?.map(item => {
        const dims = item.variantDetails?.dimensions;
        if (dims && (dims.length || dims.width || dims.height)) {
          return `${dims.length || 0}×${dims.width || 0}×${dims.height || 0}cm`;
        }
        return 'N/A';
      }).join('; ') || 'N/A'
    }));

    const parser = new Parser();
    const csv = parser.parse(formattedOrders);

    const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    req.flash('error', 'Failed to export orders');
    res.redirect('/admin/v1/order');
  }
};