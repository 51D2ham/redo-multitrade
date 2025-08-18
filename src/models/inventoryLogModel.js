const mongoose = require('mongoose');
const { Schema } = mongoose;

// Simple Inventory Log Schema - tracks all stock movements
const inventoryLogSchema = new Schema({
  // Product Info
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku: { type: String, required: true, trim: true },
  
  // Movement Info
  type: { type: String, enum: ['sale', 'restock', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  
  // Reference
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' }, // For sales
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

// Indexes
inventoryLogSchema.index({ product: 1, createdAt: -1 });
inventoryLogSchema.index({ type: 1 });
inventoryLogSchema.index({ orderId: 1 });

// Static method for low stock alerts
inventoryLogSchema.statics.getLowStockProducts = async function() {
  const { Product } = require('./productModel');
  
  const products = await Product.find({ status: 'active' })
    .populate('brand category', 'name')
    .lean();
  
  const alerts = [];
  products.forEach(product => {
    product.variants?.forEach(variant => {
      if (variant.qty <= variant.thresholdQty) {
        alerts.push({
          productId: product._id,
          title: product.title,
          brand: product.brand?.name,
          category: product.category?.name,
          sku: variant.sku,
          currentStock: variant.qty,
          threshold: variant.thresholdQty,
          status: variant.qty === 0 ? 'out_of_stock' : 'low_stock'
        });
      }
    });
  });
  
  return alerts;
};

// Static method for stock movement report
inventoryLogSchema.statics.getMovementReport = async function(filters = {}) {
  const { productId, type, dateFrom, dateTo, limit = 50, skip = 0 } = filters;
  
  const query = {};
  if (productId) query.product = productId;
  if (type) query.type = type;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  
  return this.find(query)
    .populate('product', 'title thumbnail')
    .populate('admin', 'fullname')
    .populate('orderId', '_id')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
module.exports = InventoryLog;