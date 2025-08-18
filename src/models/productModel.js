const mongoose = require('mongoose');
const { Schema } = mongoose;

// Product Variant Schema
const variantSchema = new Schema({
  sku: { type: String, required: true, trim: true },
  color: { type: String, trim: true },
  size: { type: String, trim: true },
  material: { type: String, trim: true },
  weight: { type: Number, min: 0 },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  images: [{ type: String, trim: true }],
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  discountPrice: { type: Number, min: 0 },
  qty: { type: Number, required: true, min: 0, default: 0 },
  thresholdQty: { type: Number, min: 0, default: 5 },
  status: { 
    type: String, 
    enum: ['in_stock', 'out_of_stock', 'low_stock', 'discontinued'], 
    default: 'in_stock' 
  },
  shipping: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

// Product Schema
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
    maxlength: 200,
    index: 'text'
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 5000
  },
  shortDescription: { type: String, maxlength: 500 },
  images: [{ type: String, trim: true }],
  thumbnail: { type: String, trim: true },
  
  // Base pricing
  price: { type: Number, required: true, min: 0 },
  
  // Categories
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  type: { type: Schema.Types.ObjectId, ref: 'Type', required: true },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
  
  // Variants
  variants: [variantSchema],
  
  // Calculated fields
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  totalStock: { type: Number, default: 0, min: 0 },
  minPrice: { type: Number, default: 0, min: 0 },
  maxPrice: { type: Number, default: 0, min: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'active', 'inactive', 'discontinued'], 
    default: 'draft' 
  },
  featured: { type: Boolean, default: false },
  isDiscounted: { type: Boolean, default: false },
  
  // Admin
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  
  // Business
  warranty: { type: String, trim: true },
  returnPolicy: { type: String, trim: true },
  shippingInfo: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  totalSales: { type: Number, default: 0, min: 0 },
  viewCount: { type: Number, default: 0, min: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ category: 1, subCategory: 1, type: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ tags: 1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ viewCount: -1 });

// Virtuals
productSchema.virtual('defaultVariant').get(function() {
  if (!this.variants || this.variants.length === 0) return null;
  return this.variants.find(v => v.isDefault) || this.variants[0];
});

productSchema.virtual('inStockVariants').get(function() {
  if (!this.variants || this.variants.length === 0) return [];
  return this.variants.filter(v => v.qty > 0 && v.status === 'in_stock');
});

productSchema.virtual('lowStockVariants').get(function() {
  if (!this.variants || this.variants.length === 0) return [];
  return this.variants.filter(v => v.qty <= v.thresholdQty && v.qty > 0);
});

productSchema.virtual('isOnSale').get(function() {
  if (!this.variants || this.variants.length === 0) return false;
  return this.variants.some(v => v.discountPrice && v.discountPrice < v.price);
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((sum, variant) => sum + variant.qty, 0);
    
    const activePrices = this.variants
      .filter(v => v.status === 'in_stock')
      .map(v => v.discountPrice || v.price);
    
    if (activePrices.length > 0) {
      this.minPrice = Math.min(...activePrices);
      this.maxPrice = Math.max(...activePrices);
    }
    
    const defaultVariant = this.variants.find(v => v.isDefault) || this.variants[0];
    if (defaultVariant) {
      this.price = defaultVariant.discountPrice || defaultVariant.price;
    }
    
    if (!this.thumbnail && this.images.length > 0) {
      this.thumbnail = this.images[0];
    }
    
    const hasDefault = this.variants.some(v => v.isDefault);
    if (!hasDefault && this.variants.length > 0) {
      this.variants[0].isDefault = true;
    }
    
    this.variants.forEach(variant => {
      if (variant.qty === 0) {
        variant.status = 'out_of_stock';
      } else if (variant.qty <= variant.thresholdQty) {
        variant.status = 'low_stock';
      } else {
        variant.status = 'in_stock';
      }
    });
    
    if (this.discontinueDate && this.discontinueDate < new Date()) {
      this.status = 'discontinued';
    }
  }
  next();
});

// ProductSpecs Schema
const productSpecsSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  specList: { type: Schema.Types.ObjectId, ref: 'SpecList', required: true },
  value: { type: String, required: true, trim: true }
}, { timestamps: true });

productSpecsSchema.index({ product: 1 });
productSpecsSchema.index({ specList: 1 });

// Review Schema
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 100 },
  review: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true });

reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

// Update product rating on review save
reviewSchema.post('save', async function() {
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
});

const Product = mongoose.model('Product', productSchema);
const ProductSpecs = mongoose.model('ProductSpecs', productSpecsSchema);
const Review = mongoose.model('Review', reviewSchema);

module.exports = { Product, ProductSpecs, Review };