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

// GET /admin/v1/orders - View with pagination and filters
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { _id: { $regex: search, $options: 'i' } },
        { 'items.productTitle': { $regex: search, $options: 'i' } }
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);
    const currentPage = Math.max(1, parseInt(page));

    const orders = await Order.find(filter)
      .populate('user', 'username fullname email phone')
      .populate('shippingAddress')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(Number(limit))
      .lean();

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

// GET /admin/v1/orders/:id
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { Product } = require('../models/productModel');

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
      return res.redirect('/admin/v1/orders');
    }

    // Get product specifications for each item
    if (order && order.items) {
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

    // If order has items, enhance them with product details
    if (order.items && order.items.length > 0) {
      order.items = order.items.map(item => ({
        ...item,
        productImage: item.productId?.thumbnail || (item.productId?.images && item.productId.images[0]),
        brand: item.productId?.brand?.name || 'Unknown Brand',
        category: item.productId?.category?.name || 'Unknown Category',
        variants: item.productId?.variants || []
      }));
    } else {
      // Fallback: create items from order totals
      order.items = [{
        productId: 'unknown',
        productTitle: `Order Total (${order.totalItem} items)`,
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
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    res.render('orders/show', { 
      title: 'Order Details',
      order,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Get order error:', err);
    req.flash('error', 'Failed to load order details');
    res.redirect('/admin/v1/orders');
  }
};

// GET /admin/v1/orders/new
exports.newOrder = (req, res) => {
  res.render('orders/new', {
    title: 'Create New Order',
    success: req.flash('success'),
    error: req.flash('error')
  });
};

// POST /admin/v1/orders
exports.createOrder = async (req, res) => {
  try {
    // Implementation for manual order creation
    req.flash('success', 'Order created successfully');
    res.redirect('/admin/v1/orders');
  } catch (error) {
    console.error('Create order error:', error);
    req.flash('error', 'Error: ' + error.message);
    res.redirect('/admin/v1/orders/new');
  }
};

// GET /admin/v1/orders/:id/edit
exports.renderEditOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('user', 'username fullname email phone')
      .populate('shippingAddress')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/orders');
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
    res.redirect('/admin/v1/orders');
  }
};

// PUT /admin/v1/orders/:id - Update entire order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, estimatedDelivery, notes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/orders');
    }

    // Prevent updates to final states
    if (['delivered', 'cancelled'].includes(order.status)) {
      req.flash('error', `Cannot update ${order.status} orders`);
      return res.redirect(`/admin/v1/orders/${id}`);
    }

    // Update allowed fields
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);
    if (notes) {
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: order.status,
        message: notes,
        updatedBy: req.session?.admin?.id,
        updatedAt: new Date()
      });
    }

    await order.save();
    req.flash('success', 'Order updated successfully');
    res.redirect(`/admin/v1/orders/${id}`);
  } catch (err) {
    console.error('Update order error:', err);
    req.flash('error', 'Failed to update order');
    res.redirect(`/admin/v1/orders/${req.params.id}/edit`);
  }
};

// DELETE /admin/v1/orders/:id
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/v1/orders');
    }

    // Only allow deletion of cancelled orders
    if (order.status !== 'cancelled') {
      req.flash('error', 'Only cancelled orders can be deleted');
      return res.redirect(`/admin/v1/orders/${req.params.id}`);
    }

    await Order.findByIdAndDelete(req.params.id);
    req.flash('success', 'Order deleted successfully');
    res.redirect('/admin/v1/orders');
  } catch (error) {
    req.flash('error', 'Error deleting order: ' + error.message);
    res.redirect(`/admin/v1/orders/${req.params.id}`);
  }
};

// PATCH /admin/v1/orders/:id/status - Update order status
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
      return res.status(400).json({ 
        success: false, 
        message: `Cannot change status from ${order.status} to ${status}` 
      });
    }

    const oldStatus = order.status;
    order.status = status;

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: status,
      message: statusMessage || `Order status updated to ${status}`,
      updatedBy: req.session?.admin?.id,
      updatedAt: new Date()
    });

    // Auto-update payment for delivered orders
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
      return res.json({ success: true, message: 'Status updated successfully', status });
    }

    req.flash('success', 'Order status updated successfully');
    res.redirect(`/admin/v1/orders/${id}`);
  } catch (err) {
    console.error('Update status error:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Failed to update status' });
    }
    req.flash('error', 'Failed to update order status');
    res.redirect(`/admin/v1/orders/${req.params.id}`);
  }
};

// PATCH /admin/v1/orders/:id/payment - Update payment status
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
    res.redirect(`/admin/v1/orders/${id}`);
  } catch (err) {
    console.error('Update payment error:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Failed to update payment' });
    }
    req.flash('error', 'Failed to update payment status');
    res.redirect(`/admin/v1/orders/${req.params.id}`);
  }
};

// GET /admin/v1/orders/export
exports.exportOrdersCSV = async (req, res) => {
  try {
    const { status, paymentMethod, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { _id: { $regex: search, $options: 'i' } },
        { 'items.productTitle': { $regex: search, $options: 'i' } }
      ];
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
    res.redirect('/admin/v1/orders');
  }
};