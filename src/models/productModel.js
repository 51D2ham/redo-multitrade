const mongoose = require('mongoose');
const { Schema } = mongoose;

// Product Variant Schema - Complete & Clear
const variantSchema = new Schema({
  sku: { type: String, required: true, trim: true },
  color: { type: String, trim: true },
  size: { type: String, trim: true },
  material: { type: String, trim: true },
  weight: { type: Number, min: 0 }, // in grams
  dimensions: { type: String, trim: true }, // "L x W x H cm"
  price: { type: Number, required: true, min: 0 }, // Current selling price
  originalPrice: { type: Number, min: 0 }, // Previous price for discount display
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockAlert: { type: Number, min: 0, default: 5 },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

// Product Schema - Minimal & Effective
const productSchema = new Schema({
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true
  },
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 120
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 1500
  },
  shortDescription: { type: String, maxlength: 200 },
  images: [{ type: String, trim: true, required: true }], // Main product gallery
  
  // Categories
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  type: { type: Schema.Types.ObjectId, ref: 'Type', required: true },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
  
  // Variants
  variants: [variantSchema],
  
  // Metrics
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  totalStock: { type: Number, default: 0, min: 0 },
  totalSales: { type: Number, default: 0, min: 0 },
  viewCount: { type: Number, default: 0, min: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'active', 'inactive'], 
    default: 'draft' 
  },
  featured: { type: Boolean, default: false },
  
  // Admin & Business
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  warranty: { type: String, trim: true },
  returnPolicy: { type: String, trim: true },
  shippingInfo: { type: String, trim: true },
  tags: [{ type: String, trim: true, lowercase: true }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Smart Indexes - Optimized for Performance
productSchema.index({ category: 1, subCategory: 1, type: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ rating: -1, reviewCount: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ 'variants.sku': 1 }, { sparse: true });

// Essential Virtuals - Clean & Fast
productSchema.virtual('defaultVariant').get(function() {
  if (!this.variants?.length) return null;
  return this.variants.find(v => v.isDefault) || this.variants[0];
});

productSchema.virtual('price').get(function() {
  return this.defaultVariant?.price || 0;
});

productSchema.virtual('originalPrice').get(function() {
  return this.defaultVariant?.originalPrice || null;
});

productSchema.virtual('isOnSale').get(function() {
  const variant = this.defaultVariant;
  return !!(variant?.originalPrice && variant.originalPrice > variant.price);
});

productSchema.virtual('discountPercent').get(function() {
  const variant = this.defaultVariant;
  if (!variant?.originalPrice || variant.originalPrice <= variant.price) return 0;
  return Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100);
});

productSchema.virtual('discountAmount').get(function() {
  const variant = this.defaultVariant;
  if (!variant?.originalPrice || variant.originalPrice <= variant.price) return 0;
  return variant.originalPrice - variant.price;
});

productSchema.virtual('priceStatus').get(function() {
  const variant = this.defaultVariant;
  if (!variant?.originalPrice) return 'regular';
  if (variant.originalPrice > variant.price) return 'discounted';
  if (variant.originalPrice < variant.price) return 'increased';
  return 'same';
});

productSchema.virtual('thumbnail').get(function() {
  return this.images?.[0] || null;
});

productSchema.virtual('inStock').get(function() {
  return this.totalStock > 0;
});

productSchema.virtual('lowStock').get(function() {
  if (!this.variants?.length) return false;
  return this.variants.some(v => v.stock > 0 && v.stock <= v.lowStockAlert);
});

productSchema.virtual('availableVariants').get(function() {
  if (!this.variants?.length) return [];
  return this.variants.filter(v => v.stock > 0);
});

// Pre-save Middleware - Essential Only
productSchema.pre('save', function(next) {
  if (this.variants?.length) {
    // Calculate total stock
    this.totalStock = this.variants.reduce((sum, v) => sum + v.stock, 0);
    
    // Ensure one default variant
    if (!this.variants.some(v => v.isDefault)) {
      this.variants[0].isDefault = true;
    }
    
    // Validate required fields
    if (!this.images?.length) {
      return next(new Error('At least one product image is required'));
    }
  }
  next();
});

// Static Methods for Common Queries
productSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

productSchema.statics.findFeatured = function() {
  return this.find({ status: 'active', featured: true });
};

productSchema.statics.findByCategory = function(categoryId) {
  return this.find({ category: categoryId, status: 'active' });
};

productSchema.statics.findInStock = function() {
  return this.find({ status: 'active', totalStock: { $gt: 0 } });
};

// ProductSpecs Schema - Clean
const productSpecsSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  specList: { type: Schema.Types.ObjectId, ref: 'SpecList', required: true },
  value: { type: String, required: true, trim: true }
}, { timestamps: true });

productSpecsSchema.index({ product: 1 });
productSpecsSchema.index({ specList: 1, value: 1 });

// Review Schema - Optimized
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 60 },
  review: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

// Auto-update product rating - Optimized
reviewSchema.post('save', async function() {
  try {
    const Product = mongoose.model('Product');
    const Review = mongoose.model('Review');
    
    const stats = await Review.aggregate([
      { $match: { product: this.product, status: 'approved' } },
      { 
        $group: { 
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);
    
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(this.product, {
        rating: Math.round(stats[0].averageRating * 10) / 10,
        reviewCount: stats[0].totalReviews
      });
    }
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
});

// Delete related reviews when product is deleted
reviewSchema.post('deleteOne', { document: true, query: false }, async function() {
  try {
    const Product = mongoose.model('Product');
    await Product.findByIdAndUpdate(this.product, {
      $inc: { reviewCount: -1 }
    });
  } catch (error) {
    console.error('Error updating review count:', error);
  }
});

const Product = mongoose.model('Product', productSchema);
const ProductSpecs = mongoose.model('ProductSpecs', productSpecsSchema);
const Review = mongoose.model('Review', reviewSchema);

module.exports = { Product, ProductSpecs, Review };