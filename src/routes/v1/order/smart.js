const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const OrderManagementService = require('../../../services/orderManagementService');
const { sendOrderStatusUpdate, sendItemStatusUpdate } = require('../../../utils/orderNotification');

// Smart item status update
router.patch('/:id/items/:itemIndex/smart', adminAuth, async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const { status, statusMessage, sendEmail } = req.body;
    const adminId = req.session?.admin?.id;

    const result = await OrderManagementService.updateOrderItem(
      id, 
      itemIndex, 
      status, 
      statusMessage, 
      adminId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send email notification if requested
    if (sendEmail && result.order.user?.email) {
      try {
        await sendItemStatusUpdate(
          result.order.user.email, 
          result.order, 
          result.order.items[parseInt(itemIndex)], 
          status, 
          statusMessage
        );
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Smart item update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Smart bulk item update
router.patch('/:id/items/bulk-smart', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, sendEmail } = req.body;
    const adminId = req.session?.admin?.id;

    const result = await OrderManagementService.bulkUpdateItems(id, items, adminId);

    if (!result.success && result.errors?.length > 0) {
      return res.status(400).json(result);
    }

    // Send bulk email notification
    if (sendEmail && result.order?.user?.email && result.updatedItems?.length > 0) {
      try {
        const { sendBulkStatusUpdate } = require('../../../utils/orderNotification');
        await sendBulkStatusUpdate(result.order.user.email, result.order, result.updatedItems);
      } catch (emailError) {
        console.error('Bulk email notification failed:', emailError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Smart bulk update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Smart order status update
router.patch('/:id/status/smart', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusMessage, sendEmail } = req.body;
    const adminId = req.session?.admin?.id;

    const result = await OrderManagementService.updateOrderStatus(
      id, 
      status, 
      statusMessage, 
      adminId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send email notification
    if (sendEmail && result.order?.user?.email) {
      try {
        await sendOrderStatusUpdate(
          result.order.user.email, 
          result.order, 
          status, 
          statusMessage
        );
      } catch (emailError) {
        console.error('Status update email failed:', emailError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Smart status update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get order status summary
router.get('/:id/status-summary', adminAuth, async (req, res) => {
  try {
    const { Order } = require('../../../models/orderModel');
    const order = await Order.findById(req.params.id).lean();
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const summary = OrderManagementService.getOrderStatusSummary(order);
    
    res.json({ 
      success: true, 
      data: {
        orderId: order._id,
        currentStatus: order.status,
        ...summary
      }
    });
  } catch (error) {
    console.error('Status summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Validate order status change
router.post('/:id/validate-status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const { Order } = require('../../../models/orderModel');
    const order = await Order.findById(req.params.id).lean();
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const validation = OrderManagementService.validateOrderStatusChange(order.items, status);
    
    res.json({ 
      success: true, 
      data: {
        valid: validation.valid,
        message: validation.message || 'Status change is valid',
        currentStatus: order.status,
        requestedStatus: status
      }
    });
  } catch (error) {
    console.error('Status validation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;