const { Order } = require('../models/orderModel');
const StockManager = require('../utils/stockManager');
const SalesService = require('./salesService');

class OrderManagementService {
  // Calculate optimal order status based on item statuses
  static calculateOrderStatus(items) {
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
    
    // If we have delivered items and remaining are only cancelled = delivered
    if (delivered > 0 && delivered + cancelled === total) return 'delivered';
    
    // Any item shipped (and none pending/processing) = order shipped
    if (shipped > 0 && pending === 0 && processing === 0) return 'shipped';
    
    // Any item processing = order processing
    if (processing > 0) return 'processing';
    
    // Mixed states with shipping = shipped
    if (shipped > 0) return 'shipped';
    
    // Default to pending
    return 'pending';
  }

  // Validate if order status change is allowed based on item statuses
  static validateOrderStatusChange(items, newStatus) {
    if (!items || items.length === 0) return { valid: true };
    
    const itemStatuses = items.map(item => item.status || 'pending');
    const statusCounts = itemStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const total = items.length;
    const delivered = statusCounts.delivered || 0;
    const cancelled = statusCounts.cancelled || 0;
    const shipped = statusCounts.shipped || 0;
    const processing = statusCounts.processing || 0;
    const pending = statusCounts.pending || 0;
    
    switch (newStatus) {
      case 'cancelled':
        if (cancelled < total) {
          return { 
            valid: false, 
            message: 'Cannot mark order as cancelled - not all items are cancelled' 
          };
        }
        break;
        
      case 'delivered':
        if (delivered + cancelled < total || delivered === 0) {
          return { 
            valid: false, 
            message: 'Cannot mark order as delivered - not all active items are delivered' 
          };
        }
        break;
        
      case 'shipped':
        if (shipped === 0 && processing === 0 && pending === 0) {
          return { 
            valid: false, 
            message: 'Cannot mark order as shipped - no items are in shippable state' 
          };
        }
        break;
        
      case 'processing':
        if (processing === 0 && pending === 0) {
          return { 
            valid: false, 
            message: 'Cannot mark order as processing - no items are in processable state' 
          };
        }
        break;
        
      case 'pending':
        if (pending === 0) {
          return { 
            valid: false, 
            message: 'Cannot mark order as pending - no items are pending' 
          };
        }
        break;
    }
    
    return { valid: true };
  }

  // Update single item with intelligent order status calculation
  static async updateOrderItem(orderId, itemIndex, newStatus, statusMessage, adminId) {
    try {
      const order = await Order.findById(orderId).populate('user', 'email fullname');
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      const itemIdx = parseInt(itemIndex);
      if (isNaN(itemIdx) || !order.items[itemIdx]) {
        return { success: false, message: 'Invalid item index' };
      }

      const item = order.items[itemIdx];
      const oldStatus = item.status || 'pending';

      // Validate status
      const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!allowed.includes(newStatus)) {
        return { success: false, message: 'Invalid status' };
      }

      // Prevent changing from final states
      if (['delivered', 'cancelled'].includes(oldStatus) && oldStatus !== newStatus) {
        return { 
          success: false, 
          message: `Cannot change item status from ${oldStatus} to ${newStatus}` 
        };
      }

      // Handle stock restoration for cancellation
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        try {
          const restoreResult = await StockManager.restoreStock([item], orderId, adminId);
          if (!restoreResult.success) {
            return { 
              success: false, 
              message: 'Failed to restore stock: ' + restoreResult.errors.join(', ')
            };
          }
        } catch (restockError) {
          console.error('Stock restoration failed:', restockError);
          return { 
            success: false, 
            message: 'Failed to restore stock during cancellation' 
          };
        }
      }

      // Update item status
      item.status = newStatus;
      
      // Add to item status history
      if (!item.statusHistory) item.statusHistory = [];
      item.statusHistory.push({
        status: newStatus,
        message: statusMessage || `Item ${newStatus}`,
        updatedBy: adminId,
        updatedAt: new Date()
      });
      
      // Handle sales recording for delivered items
      if (newStatus === 'delivered' && oldStatus !== 'delivered') {
        try {
          const salesResult = await SalesService.recordSalesForDeliveredItems(orderId, adminId);
          if (!salesResult.success) {
            console.error('Sales recording failed:', salesResult.error);
          }
        } catch (salesError) {
          console.error('Sales recording failed:', salesError);
        }
      }
      
      // Remove sales record if item is cancelled
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        try {
          const removalResult = await SalesService.removeSalesForCancelledItems(orderId, item.productId, item.variantSku);
          if (!removalResult.success) {
            console.error('Sales removal failed:', removalResult.error);
          }
        } catch (salesError) {
          console.error('Sales removal failed:', salesError);
        }
      }

      // Calculate new order status based on all items
      const newOrderStatus = this.calculateOrderStatus(order.items);
      const oldOrderStatus = order.status;
      
      if (newOrderStatus !== oldOrderStatus) {
        order.status = newOrderStatus;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          status: newOrderStatus,
          message: `Order auto-updated to ${newOrderStatus} based on item statuses`,
          updatedBy: adminId,
          updatedAt: new Date()
        });
      }

      await order.save();

      return { 
        success: true, 
        message: 'Item updated successfully',
        itemStatus: newStatus,
        orderStatus: order.status,
        order
      };
    } catch (error) {
      console.error('Update item error:', error);
      return { success: false, message: 'Failed to update item status' };
    }
  }

  // Bulk update multiple items with intelligent validation
  static async bulkUpdateItems(orderId, itemUpdates, adminId) {
    try {
      const order = await Order.findById(orderId).populate('user', 'email fullname');
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      const updatedItems = [];
      const errors = [];
      const oldOrderStatus = order.status;

      for (const itemUpdate of itemUpdates) {
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
              const restoreResult = await StockManager.restoreStock([item], orderId, adminId);
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
            updatedBy: adminId,
            updatedAt: new Date()
          });

          updatedItems.push({ index: itemIdx, oldStatus, newStatus: status, item });
        } catch (itemError) {
          errors.push(`Error updating item ${itemUpdate.index}`);
        }
      }

      // Calculate new order status based on all items
      const newOrderStatus = this.calculateOrderStatus(order.items);
      
      if (newOrderStatus !== oldOrderStatus) {
        order.status = newOrderStatus;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          status: newOrderStatus,
          message: `Order auto-updated to ${newOrderStatus} after bulk item updates`,
          updatedBy: adminId,
          updatedAt: new Date()
        });
      }

      await order.save();

      return { 
        success: errors.length === 0,
        message: `Updated ${updatedItems.length} items successfully`,
        updatedItems,
        errors,
        orderStatus: order.status,
        order
      };
    } catch (error) {
      console.error('Bulk update items error:', error);
      return { success: false, message: 'Failed to bulk update items' };
    }
  }

  // Smart order status update with item validation
  static async updateOrderStatus(orderId, newStatus, statusMessage, adminId) {
    try {
      const order = await Order.findById(orderId).populate('user', 'email fullname');
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Validate status transition
      if (['delivered', 'cancelled'].includes(order.status) && order.status !== newStatus) {
        return { 
          success: false, 
          message: `Cannot change status from ${order.status} to ${newStatus}` 
        };
      }

      // Validate against item statuses
      const validation = this.validateOrderStatusChange(order.items, newStatus);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      const oldStatus = order.status;
      
      // Handle stock restoration for cancellation
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        try {
          const restoreResult = await StockManager.restoreStock(order.items, orderId, adminId);
          if (!restoreResult.success) {
            return { 
              success: false, 
              message: 'Failed to restore stock: ' + restoreResult.errors.join(', ')
            };
          }
        } catch (restockError) {
          console.error('Stock restoration failed:', restockError);
          return { 
            success: false, 
            message: 'Failed to restore stock during cancellation' 
          };
        }
      }
      
      order.status = newStatus;

      // Update all items to match order status (only if they're not in final states)
      if (order.items) {
        order.items.forEach(item => {
          if (!['delivered', 'cancelled'].includes(item.status || 'pending')) {
            item.status = newStatus;
            if (!item.statusHistory) item.statusHistory = [];
            item.statusHistory.push({
              status: newStatus,
              message: `Auto-updated with order to ${newStatus}`,
              updatedBy: adminId,
              updatedAt: new Date()
            });
          }
        });
      }

      // Add to status history
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: newStatus,
        message: statusMessage || `Order ${newStatus}`,
        updatedBy: adminId,
        updatedAt: new Date()
      });

      // Auto-update payment for delivered COD orders
      if (newStatus === 'delivered' && order.paymentMethod === 'cod') {
        order.paid = true;
      }

      await order.save();

      return { 
        success: true, 
        message: 'Order updated successfully', 
        status: newStatus,
        paid: order.paid,
        order
      };
    } catch (error) {
      console.error('Update status error:', error);
      return { success: false, message: 'Failed to update status' };
    }
  }

  // Get order status summary
  static getOrderStatusSummary(order) {
    if (!order.items || order.items.length === 0) {
      return {
        totalItems: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        canUpdateOrder: false,
        suggestedOrderStatus: 'pending'
      };
    }

    const statuses = order.items.map(item => item.status || 'pending');
    const statusCounts = statuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const totalItems = order.items.length;
    const pending = statusCounts.pending || 0;
    const processing = statusCounts.processing || 0;
    const shipped = statusCounts.shipped || 0;
    const delivered = statusCounts.delivered || 0;
    const cancelled = statusCounts.cancelled || 0;

    // Determine if order can be updated
    const canUpdateOrder = !['delivered', 'cancelled'].includes(order.status);
    
    // Suggest optimal order status
    const suggestedOrderStatus = this.calculateOrderStatus(order.items);

    return {
      totalItems,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      canUpdateOrder,
      suggestedOrderStatus,
      statusMismatch: order.status !== suggestedOrderStatus
    };
  }
}

module.exports = OrderManagementService;