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
      if (type === 'sale' && !orderId) {
        throw new Error('Sales movement must have a valid orderId');
      }
      
      const logData = {
        product: productId,
        variantSku,
        type,
        quantity,
        previousStock: Number(previousStock) || 0,
        newStock: Number(newStock) || 0,
        notes: notes || `${type} operation: ${quantity} units`
      };
      
      // Add orderId if provided
      if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
        logData.orderId = orderId;
      }
      
      // Only add admin if provided and valid (for customer sales, admin can be null)
      if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
        logData.admin = adminId;
      }
      
      const log = new InventoryLog(logData);
      await log.save();
      return log;
    } catch (error) {
      console.error('Inventory log movement error:', error);
      throw error;
    }
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
        
        // Calculate correct stock values for logging
        const currentStock = variant.stock || variant.qty || 0;
        const previousStock = currentStock + item.qty; // Stock before sale
        
        // Log the sale
        const log = await this.logMovement(
          item.productId,
          variant.sku,
          'sale',
          item.qty,
          previousStock, // Stock before deduction
          currentStock,  // Stock after deduction
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
      const previousStock = variant.stock;
      variant.stock += item.qty;
      // No status field in new model - status is calculated dynamically
      await product.save();
      await InventoryService.logMovement(
        item.productId,
        variant.sku,
        'restock',
        item.qty,
        previousStock,
        variant.stock, // Use correct field name
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
    
    const previousStock = variant.stock;
    variant.stock += quantity;
    
    // No status field in new model - status is calculated dynamically
    
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
    
    const previousStock = variant.stock;
    const difference = newQuantity - previousStock;
    
    if (difference === 0) {
      throw new Error('New quantity is the same as current stock');
    }
    
    variant.stock = newQuantity;
    
    // No status field in new model - status is calculated dynamically
    
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
    try {
      const { Product } = require('../models/productModel');
      const products = await Product.find({ status: 'active' }).lean();
      const alerts = [];
      
      products.forEach(product => {
        if (product.variants) {
          product.variants.forEach(variant => {
            const stock = variant.stock || 0;
            const threshold = variant.lowStockAlert || 5;
            if (stock <= threshold) {
              alerts.push({
                productId: product._id,
                title: product.title,
                sku: variant.sku,
                stock: stock,
                threshold: threshold
              });
            }
          });
        }
      });
      
      return alerts;
    } catch (error) {
      console.error('Low stock alerts error:', error);
      return [];
    }
  }
  
  // Get movement report
  static async getMovementReport(filters = {}) {
    try {
      const { skip = 0, limit = 10, productId, type, dateFrom, dateTo } = filters;
      
      // Build query conditions
      const query = {};
      if (productId) query.product = productId;
      if (type) query.type = type;
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      const movements = await InventoryLog.find(query)
        .populate('product', 'title thumbnail')
        .populate('admin', 'fullname')
        .populate('orderId', '_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      return movements.map(movement => ({
        ...movement,
        productTitle: movement.product?.title || 'Product Not Found'
      }));
    } catch (error) {
      console.error('Movement report error:', error);
      return [];
    }
  }
  
  // Enhanced dashboard data with more metrics
  static async getDashboardData() {
    try {
      const { Product } = require('../models/productModel');
      
      const results = await Promise.all([
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
              inStock: { $sum: { $cond: [{ $gt: ['$variants.stock', '$variants.lowStockAlert'] }, 1, 0] } },
              lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$variants.stock', 0] }, { $lte: ['$variants.stock', '$variants.lowStockAlert'] }] }, 1, 0] } },
              outOfStock: { $sum: { $cond: [{ $eq: ['$variants.stock', 0] }, 1, 0] } }
            }
          }
        ]).then(result => result[0] || {})
      ]);

      // assign results to named variables (make recentMovements mutable for fallback)
      const lowStockAlerts = results[0] || [];
      let recentMovements = results[1] || [];
      const totalProducts = results[2] || 0;
      const totalVariants = results[3] || 0;
      const stockStats = results[4] || {};

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
                  '$variants.stock',
                  '$variants.price'
                ]
              }
            }
          }
        }
      ]).then(result => result[0]?.totalValue || 0).catch(() => 0);

      // If there are no inventory log movements, try to derive recent movements from sales
      try {
        if ((!recentMovements || recentMovements.length === 0)) {
          const Sale = require('../models/saleModel');
          const recentSales = await Sale.find({}).sort({ soldAt: -1 }).limit(10).lean();
          if (recentSales && recentSales.length > 0) {
            // Map sales to movement-like objects expected by the UI
            const productIds = [...new Set(recentSales.map(s => s.product).filter(Boolean))];
            const products = await Product.find({ _id: { $in: productIds } }).select('title').lean();
            const productMap = products.reduce((map, p) => ({ ...map, [p._id]: p.title }), {});
            
            recentMovements = recentSales.map(s => ({
              _id: s._id,
              productTitle: productMap[s.product] || 'Product Not Available',
              product: { _id: s.product, title: productMap[s.product] || 'Product Not Available' },
              variantSku: s.variantSku,
              type: 'sale',
              quantity: s.quantity,
              previousStock: null,
              newStock: null,
              orderId: s.orderId,
              admin: null,
              notes: 'From sales data',
              createdAt: s.soldAt
            }));
          }
        }
      } catch (e) {
        // Non-fatal - if this fails, recentMovements just remains empty
        console.error('Failed deriving recent movements from Sales:', e && e.message ? e.message : e);
      }

      // If still empty, try deriving recent movements from Orders (useful if Sales aren't recorded)
      try {
        if ((!recentMovements || recentMovements.length === 0)) {
          const { Order } = require('../models/orderModel');
          const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(20).populate('items.productId', 'title').lean();
          if (recentOrders && recentOrders.length > 0) {
            const derived = [];
            for (const ord of recentOrders) {
              if (!ord.items || ord.items.length === 0) continue;
              for (const it of ord.items) {
                if (derived.length >= 10) break;
                const productTitle = it.productId?.title || it.productTitle || 'Product Unavailable';
                derived.push({
                  _id: `${ord._id.toString()}_${it.productId || 'unknown'}`,
                  productTitle: productTitle,
                  product: { _id: it.productId?._id || it.productId, title: productTitle },
                  variantSku: it.variantSku || null,
                  type: it.status === 'delivered' ? 'sale' : 'order',
                  quantity: it.qty || 0,
                  previousStock: null,
                  newStock: null,
                  orderId: ord._id,
                  admin: null,
                  notes: 'From order data',
                  createdAt: ord.createdAt
                });
              }
              if (derived.length >= 10) break;
            }
            if (derived.length > 0) recentMovements = derived;
          }
        }
      } catch (e) {
        console.error('Failed deriving recent movements from Orders:', e && e.message ? e.message : e);
      }
      
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
        
        // Recent activity - prioritize actual inventory logs
        recentMovements: (await this.getMovementReport({ limit: 10 })) || recentMovements || []
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      console.error('Dashboard error stack:', error.stack);
      // Return safe defaults instead of throwing
      return {
        lowStockCount: 0,
        criticalStockCount: 0,
        lowStockAlerts: [],
        totalProducts: 0,
        totalVariants: 0,
        activeProducts: 0,
        draftProducts: 0,
        inactiveProducts: 0,
        inStockVariants: 0,
        lowStockVariants: 0,
        outOfStockVariants: 0,
        stockValue: 0,
        recentMovements: []
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