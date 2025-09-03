const { Product } = require('../models/productModel');
const InventoryService = require('../services/inventoryService');

class StockManager {
  /**
   * Restore stock for cancelled order items
   * @param {Array} orderItems - Array of order items
   * @param {String} orderId - Order ID for logging
   * @param {String} adminId - Admin ID for logging (optional)
   */
  static async restoreStock(orderItems, orderId, adminId = null) {
    const restoredItems = [];
    const errors = [];

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return {
        success: true,
        restoredItems: [],
        errors: [],
        message: 'No items to restore'
      };
    }

    for (const item of orderItems) {
      try {
        // Validate item data
        if (!item.productId || !item.qty || item.qty <= 0) {
          errors.push(`Invalid item data for: ${item.productTitle || 'Unknown'}`);
          continue;
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        // Find the variant that was used in the order
        let targetVariant = null;
        
        if (product.variants && product.variants.length > 0) {
          // Try to find variant by SKU if available
          if (item.variantSku) {
            targetVariant = product.variants.find(v => v.sku === item.variantSku);
          }
          
          // Fallback to default variant if SKU not found
          if (!targetVariant) {
            targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
          }
        }

        if (!targetVariant) {
          errors.push(`No variant found for product: ${item.productTitle}`);
          continue;
        }

        // Store previous stock for logging
        const previousStock = Number(targetVariant.qty) || 0;
        const restoreQty = Number(item.qty) || 0;
        const newStock = previousStock + restoreQty;
        
        // Restore stock atomically
        const result = await Product.updateOne(
          { 
            _id: item.productId, 
            'variants._id': targetVariant._id 
          },
          { 
            $inc: { 'variants.$.qty': restoreQty }
          }
        );

        if (result.modifiedCount === 0) {
          errors.push(`Failed to restore stock for: ${item.productTitle}`);
          continue;
        }

        // Update variant status based on new stock level
        const updatedProduct = await Product.findById(item.productId);
        const updatedVariant = updatedProduct.variants.id(targetVariant._id);
        
        if (updatedVariant) {
          const thresholdQty = Number(updatedVariant.thresholdQty) || 5;
          
          if (updatedVariant.qty === 0) {
            updatedVariant.status = 'out_of_stock';
          } else if (updatedVariant.qty <= thresholdQty) {
            updatedVariant.status = 'low_stock';
          } else {
            updatedVariant.status = 'in_stock';
          }
          
          await updatedProduct.save();
        }

        // Log the restoration with correct stock values
        try {
          await InventoryService.logMovement(
            item.productId,
            targetVariant.sku,
            'restock',
            restoreQty,
            previousStock, // Stock before restoration
            newStock,      // Stock after restoration
            adminId,
            orderId,
            `Stock restored due to order cancellation (Order: ${orderId})`
          );
        } catch (logError) {
          console.error('Failed to log stock restoration:', logError);
          // Don't fail the restoration for logging errors
        }

        restoredItems.push({
          productId: item.productId,
          productTitle: item.productTitle,
          variantSku: targetVariant.sku,
          quantityRestored: restoreQty,
          newStock: newStock
        });

      } catch (error) {
        console.error(`Error restoring stock for ${item.productTitle}:`, error);
        errors.push(`Error restoring ${item.productTitle}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      restoredItems,
      errors,
      message: errors.length === 0 
        ? `Successfully restored stock for ${restoredItems.length} items`
        : `Restored ${restoredItems.length} items with ${errors.length} errors`
    };
  }

  /**
   * Deduct stock for order items (used during checkout)
   * @param {Array} orderItems - Array of order items with product details
   */
  static async deductStock(orderItems) {
    const deductedItems = [];
    const errors = [];

    for (const item of orderItems) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        // Find the appropriate variant
        let targetVariant = null;
        
        if (product.variants && product.variants.length > 0) {
          targetVariant = product.variants.find(v => v.isDefault) || product.variants[0];
        }

        if (!targetVariant) {
          errors.push(`No variant found for product: ${item.productTitle}`);
          continue;
        }

        // Check if enough stock is available
        if (targetVariant.qty < item.qty) {
          errors.push(`Insufficient stock for ${item.productTitle}. Available: ${targetVariant.qty}, Required: ${item.qty}`);
          continue;
        }

        // Deduct stock atomically
        const result = await Product.updateOne(
          { 
            _id: item.productId, 
            'variants._id': targetVariant._id,
            'variants.qty': { $gte: item.qty }
          },
          { 
            $inc: { 'variants.$.qty': -item.qty }
          }
        );

        if (result.modifiedCount === 0) {
          errors.push(`Failed to deduct stock for: ${item.productTitle} (race condition)`);
          continue;
        }

        // Update variant status
        const updatedProduct = await Product.findById(item.productId);
        const updatedVariant = updatedProduct.variants.id(targetVariant._id);
        
        if (updatedVariant.qty === 0) {
          updatedVariant.status = 'out_of_stock';
        } else if (updatedVariant.qty <= updatedVariant.thresholdQty) {
          updatedVariant.status = 'low_stock';
        } else {
          updatedVariant.status = 'in_stock';
        }
        
        await updatedProduct.save();

        deductedItems.push({
          productId: item.productId,
          productTitle: item.productTitle,
          variantSku: targetVariant.sku,
          quantityDeducted: item.qty,
          newStock: targetVariant.qty - item.qty
        });

      } catch (error) {
        console.error(`Error deducting stock for ${item.productTitle}:`, error);
        errors.push(`Error deducting ${item.productTitle}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      deductedItems,
      errors,
      message: errors.length === 0 
        ? `Successfully deducted stock for ${deductedItems.length} items`
        : `Deducted ${deductedItems.length} items with ${errors.length} errors`
    };
  }
}

module.exports = StockManager;