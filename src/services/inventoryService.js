const InventoryLog = require('../models/inventoryLogModel');
const { Product } = require('../models/productModel');
const mongoose = require('mongoose');

class InventoryService {
  // Log stock movement with enhanced validation
  static async logMovement(productId, variantSku, type, quantity, previousStock, newStock, adminId, orderId = null, notes = '') {
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
    if (type === 'sale' && !orderId) {
      throw new Error('Sales movement must have a valid orderId');
    }
    // For adjustment/restock, allow both increase and decrease, but log reason
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
  }

  // Log sale movements for order items
  static async logSale(orderItems, orderId, adminId = null) {
    const logs = [];
    const errors = [];
    
    for (const item of orderItems) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }
        
        // Find the variant
        let variant = product.variants.find(v => v.isDefault) || product.variants[0];
        if (!variant) {
          errors.push(`No variant found for product: ${item.productTitle}`);
          continue;
        }
        
        // Log the sale
        const log = await this.logMovement(
          item.productId,
          variant.sku,
          'sale',
          item.qty,
          variant.qty + item.qty, // Previous stock (before deduction)
          variant.qty, // Current stock (after deduction)
          adminId,
          orderId,
          `Sale: ${item.qty} units of ${item.productTitle} (Order: ${orderId})`
        );
        
        logs.push(log);
      } catch (error) {
        console.error(`Error logging sale for ${item.productTitle}:`, error);
        errors.push(`Error logging ${item.productTitle}: ${error.message}`);
      }
    }
    
    return { logs, errors };
  }

  // Restore stock for cancelled order
  static async restoreStockForCancelledOrder(order) {
    if (!order || !order.items || !order._id) return;
    const adminId = process.env.SYSTEM_ADMIN_ID || null;
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      let variant = product.variants.find(v => v.sku === item.variantSku);
      if (!variant) variant = product.variants[0];
      const previousStock = variant.qty;
      variant.qty += item.qty;
      if (variant.qty > variant.thresholdQty) {
        variant.status = 'in_stock';
      } else if (variant.qty > 0) {
        variant.status = 'low_stock';
      } else {
        variant.status = 'out_of_stock';
      }
      await product.save();
      await InventoryService.logMovement(
        item.productId,
        variant.sku,
        'restock',
        item.qty,
        previousStock,
        variant.qty,
        adminId,
        order._id,
        `Restock due to order cancellation (${order._id})`
      );
    }
  }
  
  // Complete the rest of the methods as in the original file...
  
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
      const [lowStockAlerts, recentMovements, totalProducts, totalVariants, stockStats] = await Promise.all([
        InventoryService.getLowStockAlerts(),
        InventoryService.getMovementReport({ limit: 10 }),
        Product.countDocuments({}),
        Product.aggregate([
          { $unwind: '$variants' },
          { $group: { _id: null, total: { $sum: 1 } } }
        ]).then(result => result[0]?.total || 0),
        Product.aggregate([
          { $unwind: '$variants' },
          {
            $group: {
              _id: null,
              activeProducts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              draftProducts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
              inactiveProducts: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
              inStock: { $sum: { $cond: [{ $gt: ['$variants.qty', '$variants.thresholdQty'] }, 1, 0] } },
              lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$variants.qty', 0] }, { $lte: ['$variants.qty', '$variants.thresholdQty'] }] }, 1, 0] } },
              outOfStock: { $sum: { $cond: [{ $eq: ['$variants.qty', 0] }, 1, 0] } }
            }
          }
        ]).then(result => result[0] || {})
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
        // Stock alerts
        lowStockCount: lowStockAlerts.length,
        criticalStockCount: lowStockAlerts.filter(a => (a.stock || a.currentStock || 0) === 0).length,
        lowStockAlerts: lowStockAlerts,
        
        // Product counts
        totalProducts,
        totalVariants,
        activeProducts: stockStats.activeProducts || 0,
        draftProducts: stockStats.draftProducts || 0,
        inactiveProducts: stockStats.inactiveProducts || 0,
        
        // Stock status
        inStockVariants: stockStats.inStock || 0,
        lowStockVariants: stockStats.lowStock || 0,
        outOfStockVariants: stockStats.outOfStock || 0,
        
        // Financial
        stockValue: Math.round(stockValue),
        
        // Recent activity
        recentMovements: recentMovements || []
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      throw error; // Let the controller handle the error
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
    const { status, category, brand, minStock, maxStock, search } = filters;
    
    const matchStage = { status: 'active' };
    if (category) matchStage.category = new mongoose.Types.ObjectId(category);
    if (brand) matchStage.brand = new mongoose.Types.ObjectId(brand);
    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'variants.sku': { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(matchStage)
      .populate('brand category', 'name')
      .lean();
    
    const alerts = [];
    products.forEach(product => {
      product.variants?.forEach(variant => {
        const currentStock = variant.qty || 0;
        const threshold = variant.thresholdQty || 5;
        
        // Filter by status
        let includeByStatus = true;
        if (status === 'critical') {
          includeByStatus = currentStock === 0;
        } else if (status === 'low') {
          includeByStatus = currentStock > 0 && currentStock <= threshold;
        }
        
        const shouldInclude = (
          includeByStatus &&
          (!minStock || currentStock >= minStock) &&
          (!maxStock || currentStock <= maxStock) &&
          (currentStock <= threshold)
        );
        
        if (shouldInclude) {
          alerts.push({
            productId: product._id,
            title: product.title,
            productTitle: product.title,
            brand: product.brand?.name,
            category: product.category?.name,
            sku: variant.sku,
            variantSku: variant.sku,
            color: variant.color,
            size: variant.size,
            stock: currentStock,
            currentStock: currentStock,
            remainingStock: currentStock,
            threshold: threshold,
            thresholdQty: threshold,
            status: currentStock === 0 ? 'out_of_stock' : 'low_stock',
            price: variant.price,
            costPrice: variant.costPrice,
            lastSaleDate: null, // TODO: Get from inventory logs
            recentSales: 0 // TODO: Calculate from recent sales
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