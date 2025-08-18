const InventoryService = require('../services/inventoryService');
// Cancel order (Customer)
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userInfo.userId;
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }
    // Update status
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      message: 'Order cancelled by customer',
      updatedBy: userId,
      updatedAt: new Date()
    });
    await order.save();
    // Restock each item
    try {
      for (const item of order.items) {
        await InventoryService.restock(
          item.productId,
          item.variantSku || '',
          item.qty,
          userId,
          `Restocked due to order cancellation (${orderId})`
        );
      }
    } catch (restockError) {
      console.error('Restock error:', restockError);
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Order cancelled and items restocked',
      data: { orderId: order._id, status: order.status }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};
const { StatusCodes } = require('http-status-codes');
const { Order } = require('../models/orderModel');
const { sendOrderStatusUpdate } = require('../utils/orderNotification');

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, message, trackingNumber, estimatedDelivery } = req.body;
    const adminId = req.session?.admin?.id;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(orderId).populate('user', 'email fullname');
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    // Add to status history
    order.statusHistory.push({
      status,
      message: message || `Order status updated to ${status}`,
      updatedBy: adminId,
      updatedAt: new Date()
    });

    Object.assign(order, updateData);
    await order.save();

    // Send email notification (non-blocking)
    try {
      await sendOrderStatusUpdate(order.user.email, order, status, message);
    } catch (emailError) {
      console.error('Status update email failed:', emailError);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Get single order details with full status history
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userInfo.userId;

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('shippingAddress')
      .lean();

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Calculate progress
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    const progress = order.status === 'cancelled' ? 0 : 
                    order.status === 'delivered' ? 100 : 
                    Math.max(0, (currentIndex + 1) * 25);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...order,
        progress,
        canCancel: ['pending', 'processing'].includes(order.status)
      }
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get order details'
    });
  }
};