const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  qty: { type: Number, required: true, min: 1 },
  productType: { type: String, trim: true },
  productPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  variantSku: { type: String, trim: true }, // For variant-specific cart items
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: true });

// Pre-save middleware to calculate totalPrice and set expiry
cartSchema.pre('save', function(next) {
  this.totalPrice = this.qty * this.productPrice;
  
  // Set cart item expiry (30 minutes)
  if (this.isNew) {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  next();
});

// Add expiry field
cartSchema.add({
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
});


// Static method to get user's cart with populated product
cartSchema.statics.getUserCart = function(userId) {
  return this.find({ user: userId })
    .populate({
      path: 'product',
      select: 'title images variants category brand status totalStock',
      populate: {
        path: 'category',
        select: 'name'
      }
    })
    .populate('user', 'email fullName');
};

// Static method to get cart total for user
cartSchema.statics.getCartTotal = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: '$qty' } } }
  ]);
  return result[0] || { total: 0, count: 0 };
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;