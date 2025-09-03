const mongoose = require('mongoose');
const { Schema } = mongoose;

// Status History Schema
const statusHistorySchema = new Schema({
  status: { type: String, required: true },
  message: { type: String, trim: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  updatedAt: { type: Date, default: Date.now }
});

// Order Item Schema
const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productTitle: { type: String, required: true },
  productPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  variantSku: { type: String, trim: true }, // Store which variant was ordered
  variantDetails: {
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    material: { type: String, trim: true },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }
  }
  ,
  // Per-item status allows administrators to track fulfillment per line item
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  statusHistory: [statusHistorySchema]
});

// ...existing code...

// Order Schema
const orderSchema = new Schema({
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true, min: 0 },
  totalItem: { type: Number, required: true, min: 0 },
  totalQty: { type: Number, required: true, min: 0 },
  discountAmt: { type: Number, default: 0, min: 0 },
  couponApplied: { type: String, trim: true },
  paymentMethod: { type: String, enum: ['card', 'online', 'cod', 'other'], required: true },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  statusHistory: [statusHistorySchema],
  trackingNumber: { type: String, trim: true },
  estimatedDelivery: { type: Date },
  shippingAddress: { type: Schema.Types.ObjectId, ref: 'ShippingAddress', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Enhanced pre-save middleware with validation
orderSchema.pre('save', function(next) {
  // Validate total calculations
  if (this.items && this.items.length > 0) {
    const calculatedTotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const calculatedQty = this.items.reduce((sum, item) => sum + (item.qty || 0), 0);
    
    // Update totals if they don't match (with small tolerance for floating point)
    if (Math.abs(calculatedTotal - this.totalPrice) > 0.01) {
      this.totalPrice = Math.round(calculatedTotal * 100) / 100;
    }
    if (calculatedQty !== this.totalQty) {
      this.totalQty = calculatedQty;
    }
    if (this.items.length !== this.totalItem) {
      this.totalItem = this.items.length;
    }
  }
  
  // Track status changes
  if (this.isModified('status') && !this.isNew) {
    if (!this.statusHistory) this.statusHistory = [];
    this.statusHistory.push({
      status: this.status,
      message: `Order status changed to ${this.status}`,
      updatedAt: new Date()
    });
  } else if (this.isNew) {
    this.statusHistory = [{
      status: 'pending',
      message: 'Order placed successfully',
      updatedAt: new Date()
    }];
  }
  
  next();
});

// Add indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ 'items.productId': 1 });

//cartOrderSchema
const cartOrderSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  cart: { type: Schema.Types.ObjectId, ref: 'Cart', required: true }
}, { timestamps: true });

// OrderStatus Schema
const orderStatusSchema = new Schema({
  statusTitle: { type: String, required: true, trim: true },
  status: { type: String, required: true, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
  message: { type: String, trim: true },
  dateTime: { type: Date, default: Date.now },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true }
}, { timestamps: true });

// Create models
const Order = mongoose.model('Order', orderSchema);
const CartOrder = mongoose.model('CartOrder', cartOrderSchema);
const OrderStatus = mongoose.model('OrderStatus', orderStatusSchema);

// Export models
module.exports = { Order, CartOrder, OrderStatus };