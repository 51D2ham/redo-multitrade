const InventoryLog = require('../models/inventoryLogModel');
const { Product } = require('../models/productModel');
const mongoose = require('mongoose');

class InventoryService {
  
  // Log stock movement with enhanced validation
  static async logMovement(productId, variantSku, type, quantity, previousStock, newStock, adminId, orderId = null, notes = '') {
    try {
      // Validate inputs
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid product ID');
      }
      if (!variantSku || typeof variantSku !== 'string') {
        throw new Error('Valid variant SKU is required');
      }
      if (!['sale', 'restock', 'adjustment'].includes(type)) {
        throw new Error('Invalid movement type');
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }
      
      const log = new InventoryLog({
        product: productId,
        variantSku,
        type,
        quantity,
        previousStock,
        newStock,
        orderId,
        admin: adminId,
        notes: notes || `${type} operation: ${quantity} units`
      });
      
      await log.save();
      return log;
    } catch (error) {
      console.error('Inventory log error:', error);
      throw error;
    }
  }
  
  // Log sale with proper variant matching
  static async logSale(orderItems, orderId, adminId = null) {
    const logs = [];
    
    for (const item of orderItems) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          console.warn(`Product not found for sale logging: ${item.productId}`);
          continue;
        }
        
        // Find variant by SKU if provided, otherwise use default
        let variant;
        if (item.variantSku) {
          variant = product.variants.find(v => v.sku === item.variantSku);
        }
        if (!variant) {
          variant = product.variants.find(v => v.isDefault) || product.variants[0];
        }
        
        if (variant && variant.qty >= item.qty) {
          const previousStock = variant.qty;
          
          // Update stock in product
          variant.qty -= item.qty;
          
          // Update variant status based on new stock
          if (variant.qty === 0) {
            variant.status = 'out_of_stock';
          } else if (variant.qty <= variant.thresholdQty) {
            variant.status = 'low_stock';
          }
          
          await product.save();
          
          const log = await this.logMovement(
            item.productId,
            variant.sku,
            'sale',
            item.qty,
            previousStock,
            variant.qty,
            adminId || new mongoose.Types.ObjectId(), // System admin if none provided
            orderId,
            `Sale from order ${orderId}`
          );
          logs.push(log);
        } else {
          console.warn(`Insufficient stock for ${variant?.sku || 'unknown variant'}: requested ${item.qty}, available ${variant?.qty || 0}`);
        }
      } catch (error) {
        console.error(`Error logging sale for item ${item.productId}:`, error);
      }
    }
    
    return logs;
  }
  
  // Enhanced restock with validation
  static async restock(productId, variantSku, quantity, adminId, notes = '', unitCost = null) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');
    
    const variant = product.variants.find(v => v.sku === variantSku);
    if (!variant) throw new Error(`Variant with SKU '${variantSku}' not found`);
    
    const previousStock = variant.qty;
    variant.qty += quantity;
    
    // Update variant status based on new stock level
    if (variant.qty > variant.thresholdQty) {
      variant.status = 'in_stock';
    } else if (variant.qty > 0) {
      variant.status = 'low_stock';
    }
    
    // Update cost if provided
    if (unitCost && unitCost > 0) {
      variant.costPrice = unitCost;
    }
    
    await product.save();
    
    return await this.logMovement(
      productId,
      variantSku,
      'restock',
      quantity,
      previousStock,
      variant.qty,
      adminId,
      null,
      notes || `Restocked ${quantity} units${unitCost ? ` at ₹${unitCost} per unit` : ''}`
    );
  }
  
  // Enhanced stock adjustment with validation
  static async adjustStock(productId, variantSku, newQuantity, adminId, notes = '', reason = 'adjustment') {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }
    if (typeof newQuantity !== 'number' || newQuantity < 0) {
      throw new Error('New quantity must be a non-negative number');
    }
    
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');
    
    const variant = product.variants.find(v => v.sku === variantSku);
    if (!variant) throw new Error(`Variant with SKU '${variantSku}' not found`);
    
    const previousStock = variant.qty;
    const difference = newQuantity - previousStock;
    
    if (difference === 0) {
      throw new Error('New quantity is the same as current stock');
    }
    
    variant.qty = newQuantity;
    
    // Update variant status based on new stock level
    if (variant.qty === 0) {
      variant.status = 'out_of_stock';
    } else if (variant.qty <= variant.thresholdQty) {
      variant.status = 'low_stock';
    } else {
      variant.status = 'in_stock';
    }
    
    await product.save();
    
    return await this.logMovement(
      productId,
      variantSku,
      'adjustment',
      Math.abs(difference),
      previousStock,
      newQuantity,
      adminId,
      null,
      notes || `Stock ${difference > 0 ? 'increased' : 'decreased'} from ${previousStock} to ${newQuantity} (${reason})`
    );
  }
  
  // Get low stock alerts
  static async getLowStockAlerts() {
    return await InventoryLog.getLowStockProducts();
  }
  
  // Get movement report
  static async getMovementReport(filters) {
    const { skip = 0, ...otherFilters } = filters;
    return await InventoryLog.getMovementReport({ ...otherFilters, skip });
  }
  
  // Enhanced dashboard data with more metrics
  static async getDashboardData() {
    try {
      const [lowStockAlerts, recentMovements, totalProducts, totalVariants] = await Promise.all([
        this.getLowStockAlerts().catch(() => []),
        this.getMovementReport({ limit: 10 }).catch(() => []),
        Product.countDocuments({ status: 'active' }).catch(() => 0),
        Product.aggregate([
          { $match: { status: 'active' } },
          { $project: { variantCount: { $size: '$variants' } } },
          { $group: { _id: null, total: { $sum: '$variantCount' } } }
        ]).then(result => result[0]?.total || 0).catch(() => 0)
      ]);
      
      // Calculate stock value
      const stockValue = await Product.aggregate([
        { $match: { status: 'active' } },
        { $unwind: '$variants' },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: [
                  '$variants.qty',
                  { $ifNull: ['$variants.costPrice', '$variants.price'] }
                ]
              }
            }
          }
        }
      ]).then(result => result[0]?.totalValue || 0).catch(() => 0);
      
      return {
        lowStockCount: lowStockAlerts.length,
        criticalStockCount: lowStockAlerts.filter(a => a.status === 'out_of_stock').length,
        recentMovements: recentMovements || [],
        lowStockAlerts: lowStockAlerts.slice(0, 5),
        totalProducts,
        totalVariants,
        stockValue: Math.round(stockValue)
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      return {
        lowStockCount: 0,
        criticalStockCount: 0,
        recentMovements: [],
        lowStockAlerts: [],
        totalProducts: 0,
        totalVariants: 0,
        stockValue: 0
      };
    }
  }
  
  // Get product stock summary
  static async getProductStockSummary(productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }
    
    const product = await Product.findById(productId)
      .populate('brand category', 'name')
      .lean();
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    const movements = await InventoryLog.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('admin', 'fullname')
      .lean();
    
    return {
      product: {
        _id: product._id,
        title: product.title,
        brand: product.brand?.name,
        category: product.category?.name,
        thumbnail: product.thumbnail
      },
      variants: product.variants.map(v => ({
        _id: v._id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        qty: v.qty,
        thresholdQty: v.thresholdQty,
        status: v.status,
        price: v.price,
        costPrice: v.costPrice
      })),
      recentMovements: movements
    };
  }
  
  // Bulk stock update for multiple variants
  static async bulkUpdateStock(updates, adminId, notes = 'Bulk stock update') {
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const { productId, variantSku, quantity, type = 'adjustment' } = update;
        
        if (type === 'restock') {
          const result = await this.restock(productId, variantSku, quantity, adminId, notes);
          results.push(result);
        } else if (type === 'adjustment') {
          const result = await this.adjustStock(productId, variantSku, quantity, adminId, notes);
          results.push(result);
        }
      } catch (error) {
        errors.push({
          update,
          error: error.message
        });
      }
    }
    
    return { results, errors };
  }
  
  // Get stock alerts with enhanced filtering
  static async getStockAlerts(filters = {}) {
    const { status, category, brand, minStock, maxStock } = filters;
    
    const matchStage = { status: 'active' };
    if (category) matchStage.category = new mongoose.Types.ObjectId(category);
    if (brand) matchStage.brand = new mongoose.Types.ObjectId(brand);
    
    const products = await Product.find(matchStage)
      .populate('brand category', 'name')
      .lean();
    
    const alerts = [];
    products.forEach(product => {
      product.variants?.forEach(variant => {
        const shouldInclude = (
          (!status || variant.status === status) &&
          (!minStock || variant.qty >= minStock) &&
          (!maxStock || variant.qty <= maxStock) &&
          (variant.qty <= variant.thresholdQty)
        );
        
        if (shouldInclude) {
          alerts.push({
            productId: product._id,
            title: product.title,
            brand: product.brand?.name,
            category: product.category?.name,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            currentStock: variant.qty,
            threshold: variant.thresholdQty,
            status: variant.qty === 0 ? 'out_of_stock' : 'low_stock',
            price: variant.price,
            costPrice: variant.costPrice
          });
        }
      });
    });
    
    return alerts.sort((a, b) => {
      if (a.status === 'out_of_stock' && b.status !== 'out_of_stock') return -1;
      if (b.status === 'out_of_stock' && a.status !== 'out_of_stock') return 1;
      return a.currentStock - b.currentStock;
    });
  }
}

module.exports = InventoryService;