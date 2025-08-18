const mongoose = require('mongoose');
const { Schema } = mongoose;

// Wishlist Schema
const wishlistSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku: { type: String, trim: true } // Optional variant SKU
}, { timestamps: true });

// Indexes
wishlistSchema.index({ product: 1 });
wishlistSchema.index({ user: 1, product: 1, variantSku: 1 }, { unique: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;