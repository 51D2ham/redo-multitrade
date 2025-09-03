/**
 * Mixed Order Stock Management Service
 * Handles complex stock operations for orders with mixed item statuses
 */

const { Product } = require('../models/productModel');
const InventoryService = require('./inventoryService');
const mongoose = require('mongoose');

class MixedOrderStockService {
  /**
   * Handle stock for mixed order status changes
   * @param {Object} order - Order object with items
   * @param {String} adminId - Admin performing the action
   * @returns {Object} Result with success status and details
   */
  static async handleMixedOrderStock(order, adminId = null) {
    const results = {
      success: true,
      stockUpdates: [],
      errors: [],
      summary: {
        delivered: 0,
        cancelled: 0,
        active: 0,
        stockRestored: 0,
        stockDeducted: 0
      }
    };

    if (!order || !order.items || !Array.isArray(order.items)) {
      return { success: false, error: 'Invalid order or items' };
    }

    for (const item of order.items) {
      try {
        const itemResult = await this.handleItemStock(item, order._id, adminId);
        
        if (itemResult.success) {
          results.stockUpdates.push(itemResult);
          
          // Update summary
          const status = item.status || 'pending';
          if (status === 'delivered') results.summary.delivered++;
          else if (status === 'cancelled') results.summary.cancelled++;
          else results.summary.active++;
          
          if (itemResult.stockChange > 0) results.summary.stockRestored += itemResult.stockChange;
          else if (itemResult.stockChange < 0) results.summary.stockDeducted += Math.abs(itemResult.stockChange);
        } else {
          results.errors.push(itemResult.error);
          results.success = false;
        }
      } catch (error) {
        results.errors.push(`Error processing item ${item.productTitle}: ${error.message}`);
        results.success = false;
      }
    }

    return results;
  }

  /**
   * Handle stock for individual item status change
   * @param {Object} item - Order item
   * @param {String} orderId - Order ID
   * @param {String} adminId - Admin ID
   * @returns {Object} Result with stock change details
   */
  static async handleItemStock(item, orderId, adminId = null) {
    try {
      const product = await Product.findById(item.productId);
      if (!product) {
        return { success: false, error: `Product not found: ${item.productId}` };
      }

      // Find the correct variant
      let targetVariant = null;
      if (product.variants && product.variants.length > 0) {
        if (item.variantSku) {
          targetVariant = product.variants.find(v => v.sku === item.variantSku);
        }
        if (!targetVariant) {
          targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
        }
      }

      if (!targetVariant) {
        return { success: false, error: `No variant found for product: ${item.productTitle}` };
      }

      const currentStatus = item.status || 'pending';
      const previousStock = targetVariant.stock;
      let stockChange = 0;
      let action = 'none';

      // Determine stock action based on status
      switch (currentStatus) {
        case 'cancelled':
          // Restore stock for cancelled items
          stockChange = item.qty;
          action = 'restore';
          break;
        case 'delivered':
          // Ensure stock is properly deducted (should already be done at checkout)
          // This is mainly for verification
          action = 'verify';
          break;
        default:
          // For pending, processing, shipped - stock should remain deducted
          action = 'maintain';
      }

      if (stockChange !== 0) {
        // Update stock atomically
        const updateResult = await Product.updateOne(
          { 
            _id: item.productId, 
            'variants._id': targetVariant._id 
          },
          { 
            $inc: { 'variants.$.stock': stockChange }
          }
        );

        if (updateResult.modifiedCount === 0) {
          return { success: false, error: `Failed to update stock for: ${item.productTitle}` };
        }

        // Update variant status based on new stock level
        const updatedProduct = await Product.findById(item.productId);
        const updatedVariant = updatedProduct.variants.id(targetVariant._id);
        
        if (updatedVariant) {
          const newStock = updatedVariant.stock;
          const thresholdQty = updatedVariant.lowStockAlert || 5;
          
          // Update product's total stock
          updatedProduct.totalStock = updatedProduct.variants.reduce((sum, v) => sum + v.stock, 0);
          await updatedProduct.save();

          // Log the movement
          try {
            await InventoryService.logMovement(
              item.productId,
              targetVariant.sku,
              action === 'restore' ? 'restock' : 'adjustment',
              Math.abs(stockChange),
              previousStock,
              newStock,
              adminId,
              orderId,
              `Stock ${action} for item status: ${currentStatus} (Order: ${orderId})`
            );
          } catch (logError) {
            console.error('Failed to log stock movement:', logError);
          }
        }
      }

      return {
        success: true,
        productId: item.productId,
        productTitle: item.productTitle,
        variantSku: targetVariant.sku,
        action,
        stockChange,
        previousStock,
        newStock: previousStock + stockChange,
        status: currentStatus
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate revenue impact for mixed order
   * @param {Object} order - Order object with items
   * @returns {Object} Revenue breakdown
   */
  static calculateRevenueImpact(order) {
    if (!order || !order.items || !Array.isArray(order.items)) {
      return {
        deliveredRevenue: 0,
        activeRevenue: 0,
        cancelledRevenue: 0,
        totalRevenue: order.totalPrice || 0,
        fulfillmentRate: 0
      };
    }

    let deliveredRevenue = 0;
    let activeRevenue = 0;
    let cancelledRevenue = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    order.items.forEach(item => {
      const status = item.status || 'pending';
      const itemValue = item.totalPrice || 0;

      if (status === 'delivered') {
        deliveredRevenue += itemValue;
        deliveredCount++;
      } else if (status === 'cancelled') {
        cancelledRevenue += itemValue;
        cancelledCount++;
      } else {
        activeRevenue += itemValue;
      }
    });

    const activeItems = order.items.length - cancelledCount;
    const fulfillmentRate = activeItems > 0 ? Math.round((deliveredCount / activeItems) * 100) : 0;

    return {
      deliveredRevenue,
      activeRevenue,
      cancelledRevenue,
      totalRevenue: deliveredRevenue + activeRevenue,
      fulfillmentRate,
      deliveredCount,
      cancelledCount,
      activeCount: activeItems
    };
  }

  /**
   * Get stock status for order items
   * @param {Array} items - Order items
   * @returns {Object} Stock status summary
   */
  static async getOrderStockStatus(items) {
    const stockStatus = {
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      unavailable: 0,
      items: []
    };

    for (const item of items) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          stockStatus.unavailable++;
          stockStatus.items.push({
            ...item,
            stockStatus: 'unavailable',
            currentStock: 0,
            message: 'Product not found'
          });
          continue;
        }

        let targetVariant = null;
        if (product.variants && product.variants.length > 0) {
          if (item.variantSku) {
            targetVariant = product.variants.find(v => v.sku === item.variantSku);
          }
          if (!targetVariant) {
            targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
          }
        }

        if (!targetVariant) {
          stockStatus.unavailable++;
          stockStatus.items.push({
            ...item,
            stockStatus: 'unavailable',
            currentStock: 0,
            message: 'No variant available'
          });
          continue;
        }

        const currentStock = targetVariant.stock;
        const threshold = targetVariant.lowStockAlert || 5;
        let status = 'in_stock';
        let message = `${currentStock} units available`;

        if (currentStock === 0) {
          status = 'out_of_stock';
          message = 'Out of stock';
          stockStatus.outOfStock++;
        } else if (currentStock <= threshold) {
          status = 'low_stock';
          message = `Low stock: ${currentStock} units`;
          stockStatus.lowStock++;
        } else {
          stockStatus.inStock++;
        }

        stockStatus.items.push({
          ...item,
          stockStatus: status,
          currentStock,
          threshold,
          message
        });

      } catch (error) {
        stockStatus.unavailable++;
        stockStatus.items.push({
          ...item,
          stockStatus: 'error',
          currentStock: 0,
          message: `Error checking stock: ${error.message}`
        });
      }
    }

    return stockStatus;
  }

  /**
   * Validate stock before order status change
   * @param {Object} order - Order object
   * @param {String} newStatus - New order status
   * @returns {Object} Validation result
   */
  static async validateStockForStatusChange(order, newStatus) {
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      stockImpact: []
    };

    if (!order || !order.items) {
      validation.valid = false;
      validation.errors.push('Invalid order data');
      return validation;
    }

    for (const item of order.items) {
      const currentStatus = item.status || 'pending';
      
      // Check if status change affects stock
      if (currentStatus === 'cancelled' && newStatus !== 'cancelled') {
        // Reactivating cancelled item - check if stock is available
        try {
          const product = await Product.findById(item.productId);
          if (product && product.variants) {
            let targetVariant = product.variants.find(v => v.sku === item.variantSku);
            if (!targetVariant) {
              targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
            }
            
            if (targetVariant && targetVariant.stock < item.qty) {
              validation.warnings.push(
                `Insufficient stock for ${item.productTitle}: need ${item.qty}, have ${targetVariant.stock}`
              );
            }
          }
        } catch (error) {
          validation.errors.push(`Error checking stock for ${item.productTitle}: ${error.message}`);
        }
      }
    }

    return validation;
  }

  /**
   * Get low stock alerts for delivered items
   * @param {Array} orders - Array of orders
   * @returns {Array} Low stock alerts
   */
  static async getLowStockAlertsFromOrders(orders) {
    const alerts = [];
    const productMap = new Map();

    // Collect all delivered items
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          if (item.status === 'delivered') {
            const key = `${item.productId}_${item.variantSku || 'default'}`;
            if (!productMap.has(key)) {
              productMap.set(key, {
                productId: item.productId,
                variantSku: item.variantSku,
                productTitle: item.productTitle,
                totalSold: 0
              });
            }
            productMap.get(key).totalSold += item.qty;
          }
        }
      }
    }

    // Check current stock levels
    for (const [key, data] of productMap) {
      try {
        const product = await Product.findById(data.productId);
        if (product && product.variants) {
          let targetVariant = product.variants.find(v => v.sku === data.variantSku);
          if (!targetVariant) {
            targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
          }
          
          if (targetVariant) {
            const threshold = targetVariant.lowStockAlert || 5;
            if (targetVariant.stock <= threshold) {
              alerts.push({
                productId: data.productId,
                productTitle: data.productTitle,
                variantSku: data.variantSku,
                currentStock: targetVariant.stock,
                threshold,
                totalSold: data.totalSold,
                status: targetVariant.stock === 0 ? 'out_of_stock' : 'low_stock'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error checking stock for ${data.productTitle}:`, error);
      }
    }

    return alerts.sort((a, b) => a.currentStock - b.currentStock);
  }
}

module.exports = MixedOrderStockService;