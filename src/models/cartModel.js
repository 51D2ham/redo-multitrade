const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  qty: { type: Number, required: true, min: 1, max: 100 },
  productType: { type: String, trim: true },
  productPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  variantSku: { type: String, trim: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

// Pre-save middleware to calculate totalPrice and set expiry
cartSchema.pre('save', function(next) {
  // Ensure numeric values are properly calculated
  const qty = Number(this.qty) || 1;
  const price = Number(this.productPrice) || 0;
  this.totalPrice = Math.round(qty * price * 100) / 100; // Round to 2 decimal places
  
  // Set cart item expiry (2 hours for better UX)
  if (this.isNew) {
    this.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }
  
  next();
});




// Static method to get user's cart with populated product
cartSchema.statics.getUserCart = function(userId) {
  const mongoose = require('mongoose');
  return this.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate({
      path: 'product',
      select: 'title images variants category brand status totalStock',
      populate: {
        path: 'category',
        select: 'name'
      }
    })
    .populate('user', 'email fullname')
    .sort({ createdAt: -1 });
};

// Static method to get cart total for user
cartSchema.statics.getCartTotal = async function(userId) {
  const mongoose = require('mongoose');
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$totalPrice' }, 
        count: { $sum: '$qty' },
        items: { $sum: 1 }
      } 
    }
  ]);
  return result[0] || { total: 0, count: 0, items: 0 };
};

// Add compound index for better query performance
cartSchema.index({ user: 1, product: 1, variantSku: 1 }, { unique: true });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;