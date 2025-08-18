const { Order } = require('../models/orderModel');
const User = require('../models/userRegisterModel');
const ShippingAddress = require('../models/shippingAddressSchema');
const { sendOrderStatusUpdate } = require('../utils/orderNotification');
const { Parser } = require('json2csv');
const { StatusCodes } = require('http-status-codes');

// Status transition validation
const validateStatusTransition = (currentStatus, newStatus) => {
  const statusFlow = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
  };
  return statusFlow[currentStatus]?.includes(newStatus) || false;
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
      .populate('items.productId', 'title price thumbnail');

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

    // Enhance items with product details
    if (order.items?.length > 0) {
      order.items = order.items.map(item => ({
        ...item,
        productImage: item.productId?.thumbnail || item.productId?.images?.[0],
        brand: item.productId?.brand?.name || 'Unknown Brand',
        category: item.productId?.category?.name || 'Unknown Category',
        variants: item.productId?.variants || []
      }));
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
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    res.render('orders/edit', { 
      title: 'Edit Order',
      order,
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

    const order = await Order.findById(id).populate('user', 'email fullname');
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/order');
    }

    // Prevent updates to final states (unless it's the same status)
    if (['delivered', 'cancelled'].includes(order.status) && order.status !== status) {
      req.flash('error', `Cannot modify ${order.status} orders`);
      return res.redirect(`/admin/v1/order/${id}`);
    }

    let statusChanged = false;
    
    // Handle status change
    if (status && status !== order.status) {
      // Validate status transition
      if (!validateStatusTransition(order.status, status)) {
        req.flash('error', `Cannot change status from ${order.status} to ${status}`);
        return res.redirect(`/admin/v1/order/${id}/edit`);
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
            req.flash('error', 'Failed to restore stock during cancellation: ' + restoreResult.errors.join(', '));
            return res.redirect(`/admin/v1/order/${id}/edit`);
          }
        } catch (restockError) {
          console.error('Stock restoration failed:', restockError);
          req.flash('error', 'Failed to restore stock during cancellation');
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

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusMessage } = req.body;

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
          if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({ 
              success: false, 
              message: 'Failed to restore stock during cancellation',
              errors: restoreResult.errors
            });
          }
          req.flash('error', 'Failed to restore stock during cancellation');
          return res.redirect(`/admin/v1/order/${id}`);
        }
      } catch (restockError) {
        console.error('Stock restoration failed:', restockError);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(500).json({ success: false, message: 'Failed to restore stock during cancellation' });
        }
        req.flash('error', 'Failed to restore stock during cancellation');
        return res.redirect(`/admin/v1/order/${id}`);
      }
    }
    
    order.status = status;

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: status,
      message: statusMessage || `Order status updated from ${oldStatus} to ${status}`,
      updatedBy: req.session?.admin?.id,
      updatedAt: new Date()
    });

    // Auto-update payment for delivered COD orders
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paid = true;
    }

    await order.save();

    // Send email notification (non-blocking)
    if (order.user?.email) {
      try {
        await sendOrderStatusUpdate(order.user.email, order, status, statusMessage);
      } catch (emailError) {
        console.error('Status update email failed:', emailError);
      }
    }

    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: 'Status updated successfully', 
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
      Prices: order.items?.map(item => `₹${item.productPrice}`).join('; ') || 'N/A'
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