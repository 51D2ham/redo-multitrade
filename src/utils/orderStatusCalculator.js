/**
 * Order Status Calculator Utility
 * Handles complex order status calculations for mixed item statuses
 */

class OrderStatusCalculator {
  /**
   * Calculate order totals considering item statuses
   * @param {Array} items - Order items with status
   * @returns {Object} Calculated totals
   */
  static calculateOrderTotals(items) {
    if (!items || !Array.isArray(items)) {
      return {
        totalItems: 0,
        totalQty: 0,
        totalPrice: 0,
        deliveredItems: 0,
        deliveredQty: 0,
        deliveredValue: 0,
        cancelledItems: 0,
        cancelledQty: 0,
        cancelledValue: 0,
        activeItems: 0,
        activeQty: 0,
        activeValue: 0
      };
    }

    const totals = {
      totalItems: items.length,
      totalQty: 0,
      totalPrice: 0,
      deliveredItems: 0,
      deliveredQty: 0,
      deliveredValue: 0,
      cancelledItems: 0,
      cancelledQty: 0,
      cancelledValue: 0,
      activeItems: 0,
      activeQty: 0,
      activeValue: 0
    };

    items.forEach(item => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.totalPrice) || 0;
      const status = item.status || 'pending';

      // Overall totals
      totals.totalQty += qty;
      totals.totalPrice += price;

      // Status-specific totals
      if (status === 'delivered') {
        totals.deliveredItems++;
        totals.deliveredQty += qty;
        totals.deliveredValue += price;
      } else if (status === 'cancelled') {
        totals.cancelledItems++;
        totals.cancelledQty += qty;
        totals.cancelledValue += price;
      } else {
        // Active items (pending, processing, shipped)
        totals.activeItems++;
        totals.activeQty += qty;
        totals.activeValue += price;
      }
    });

    return totals;
  }

  /**
   * Calculate revenue from order considering only delivered items
   * @param {Object} order - Order object
   * @returns {Number} Revenue from delivered items only
   */
  static calculateDeliveredRevenue(order) {
    if (!order || !order.items || !Array.isArray(order.items)) {
      return 0;
    }

    return order.items
      .filter(item => item.status === 'delivered')
      .reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  }

  /**
   * Check if order is partially fulfilled
   * @param {Array} items - Order items
   * @returns {Boolean} True if order has mixed statuses
   */
  static isPartiallyFulfilled(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return false;
    }

    const statuses = items.map(item => item.status || 'pending');
    const uniqueStatuses = [...new Set(statuses)];
    
    // Mixed statuses indicate partial fulfillment
    return uniqueStatuses.length > 1;
  }

  /**
   * Get order fulfillment percentage
   * @param {Array} items - Order items
   * @returns {Number} Fulfillment percentage (0-100)
   */
  static getFulfillmentPercentage(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 0;
    }

    const deliveredCount = items.filter(item => item.status === 'delivered').length;
    const nonCancelledCount = items.filter(item => item.status !== 'cancelled').length;
    
    if (nonCancelledCount === 0) return 0;
    
    return Math.round((deliveredCount / nonCancelledCount) * 100);
  }

  /**
   * Get order status summary for display
   * @param {Array} items - Order items
   * @returns {Object} Status summary
   */
  static getStatusSummary(items) {
    if (!items || !Array.isArray(items)) {
      return {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        total: 0,
        isPartial: false,
        fulfillmentRate: 0
      };
    }

    const summary = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      total: items.length,
      isPartial: false,
      fulfillmentRate: 0
    };

    items.forEach(item => {
      const status = item.status || 'pending';
      if (summary.hasOwnProperty(status)) {
        summary[status]++;
      }
    });

    summary.isPartial = this.isPartiallyFulfilled(items);
    summary.fulfillmentRate = this.getFulfillmentPercentage(items);

    return summary;
  }

  /**
   * Determine if order should be included in revenue calculations
   * @param {Object} order - Order object
   * @returns {Boolean} True if order contributes to revenue
   */
  static shouldIncludeInRevenue(order) {
    if (!order) return false;
    
    // Include if order has any delivered items or is not fully cancelled
    if (order.items && Array.isArray(order.items)) {
      const hasDeliveredItems = order.items.some(item => item.status === 'delivered');
      const allCancelled = order.items.every(item => item.status === 'cancelled');
      return hasDeliveredItems || !allCancelled;
    }
    
    // Fallback to order status
    return order.status !== 'cancelled';
  }

  /**
   * Calculate effective order value (delivered + active items)
   * @param {Object} order - Order object
   * @returns {Number} Effective order value
   */
  static calculateEffectiveValue(order) {
    if (!order || !order.items || !Array.isArray(order.items)) {
      return order.totalPrice || 0;
    }

    return order.items
      .filter(item => item.status !== 'cancelled')
      .reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  }

  /**
   * Get items by status
   * @param {Array} items - Order items
   * @param {String} status - Status to filter by
   * @returns {Array} Filtered items
   */
  static getItemsByStatus(items, status) {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item => (item.status || 'pending') === status);
  }

  /**
   * Check if order can be cancelled
   * @param {Object} order - Order object
   * @returns {Boolean} True if order can be cancelled
   */
  static canBeCancelled(order) {
    if (!order) return false;
    
    // Cannot cancel if already delivered or cancelled
    if (['delivered', 'cancelled'].includes(order.status)) return false;
    
    // Check if any items are already delivered
    if (order.items && Array.isArray(order.items)) {
      return !order.items.some(item => item.status === 'delivered');
    }
    
    return true;
  }

  /**
   * Get next possible statuses for an order
   * @param {Object} order - Order object
   * @returns {Array} Array of possible next statuses
   */
  static getPossibleStatuses(order) {
    if (!order) return [];
    
    const currentStatus = order.status || 'pending';
    const statusSummary = this.getStatusSummary(order.items);
    
    const possibleStatuses = [];
    
    switch (currentStatus) {
      case 'pending':
        possibleStatuses.push('processing', 'cancelled');
        break;
      case 'processing':
        possibleStatuses.push('shipped', 'cancelled');
        if (statusSummary.delivered > 0) possibleStatuses.push('delivered');
        break;
      case 'shipped':
        possibleStatuses.push('delivered');
        if (statusSummary.cancelled < statusSummary.total) possibleStatuses.push('cancelled');
        break;
      case 'delivered':
        // Delivered orders cannot change status
        break;
      case 'cancelled':
        // Cancelled orders cannot change status
        break;
    }
    
    return possibleStatuses;
  }
}

module.exports = OrderStatusCalculator;