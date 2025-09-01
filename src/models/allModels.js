// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// // ================================
// // ADMIN & USER SCHEMAS
// // ================================

// // Admin Schema
// const adminSchema = new Schema({
//   username: { type: String, required: true, unique: true, trim: true },
//   email: { type: String, required: true, unique: true, trim: true, lowercase: true },
//   fullname: { type: String, required: true, trim: true },
//   phone: { type: String, required: true, unique: true, trim: true },
//   password: { type: String, required: true, minlength: 8 },
//   gender: { type: String, enum: ['male', 'female', 'other'], required: true },
//   dob: { type: Date, required: true },
//   profileImage: { type: String, trim: true },
//   permanentAddress: { type: String, trim: true },
//   tempAddress: { type: String, trim: true },
//   resOTP: { type: String },
//   OTP_Expires: { type: Date },
//   tokenVersion: { type: Number, default: 0 },
//   status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
//   role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' }
// }, { timestamps: true });

// // User Schema
// const userSchema = new Schema({
//   username: { type: String, required: true, unique: true, trim: true },
//   email: { type: String, required: true, unique: true, trim: true, lowercase: true },
//   fullname: { type: String, required: true, trim: true },
//   phone: { type: String, required: true, unique: true, trim: true },
//   password: { type: String, required: true, minlength: 8 },
//   gender: { type: String, enum: ['male', 'female', 'other'], required: true },
//   dob: { type: Date, required: true },
//   profileImage: { type: String, trim: true },
//   permanentAddress: { type: String, trim: true },
//   tempAddress: { type: String, trim: true },
//   resOTP: { type: String },
//   OTP_Expires: { type: Date },
//   tokenVersion: { type: Number, default: 0 },
//   status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
// }, { timestamps: true });

// // ================================
// // PRODUCT CATEGORIZATION SCHEMAS
// // ================================

// // Category Schema
// const categorySchema = new Schema({
//   name: { type: String, required: true, unique: true, trim: true },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // SubCategory Schema
// const subCategorySchema = new Schema({
//   name: { type: String, required: true, trim: true },
//   category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // Type Schema
// const typeSchema = new Schema({
//   name: { type: String, required: true, trim: true },
//   category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
//   subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // Brand Schema
// const brandSchema = new Schema({
//   name: { type: String, required: true, unique: true, trim: true },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // ================================
// // SPECIFICATION SCHEMAS
// // ================================

// // SpecList Schema
// const specListSchema = new Schema({
//   title: { type: String, required: true, trim: true },
//   value: { type: String, trim: true },
//   status: { type: String, enum: ['active', 'inactive'], default: 'active' },
//   displayInFilter: { type: Boolean, default: false },
//   category: { type: Schema.Types.ObjectId, ref: 'Category' },
//   subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
//   type: { type: Schema.Types.ObjectId, ref: 'Type' },
//   brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // ProductSpecs Schema
// const productSpecsSchema = new Schema({
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//   specList: { type: Schema.Types.ObjectId, ref: 'SpecList', required: true },
//   value: { type: String, required: true, trim: true }
// }, { timestamps: true });

// // ================================
// // PRODUCT SCHEMAS
// // ================================

// // Product Variant Schema
// const variantSchema = new Schema({
//   sku: { type: String, required: true, trim: true },
//   color: { type: String, trim: true },
//   size: { type: String, trim: true },
//   material: { type: String, trim: true },
//   weight: { type: Number, min: 0 },
//   dimensions: {
//     length: { type: Number, min: 0 },
//     width: { type: Number, min: 0 },
//     height: { type: Number, min: 0 }
//   },
//   images: [{ type: String, trim: true }],
//   price: { type: Number, required: true, min: 0 },
//   oldPrice: { type: Number, min: 0 },
//   discountPrice: { type: Number, min: 0 },
//   qty: { type: Number, required: true, min: 0, default: 0 },
//   thresholdQty: { type: Number, min: 0, default: 5 },
//   status: { 
//     type: String, 
//     enum: ['in_stock', 'out_of_stock', 'low_stock', 'discontinued'], 
//     default: 'in_stock' 
//   },
//   shipping: { type: Boolean, default: true },
//   isDefault: { type: Boolean, default: false }
// }, { _id: true });

// // Product Schema
// const productSchema = new Schema({
//   slug: { 
//     type: String, 
//     required: true, 
//     unique: true, 
//     trim: true,
//     lowercase: true
//   },
//   title: { 
//     type: String, 
//     required: true, 
//     trim: true,
//     maxlength: 200,
//     index: 'text'
//   },
//   description: { 
//     type: String, 
//     required: true,
//     maxlength: 5000
//   },
//   shortDescription: { type: String, maxlength: 500 },
//   images: [{ type: String, trim: true }],
//   thumbnail: { type: String, trim: true },
  
//   // Base pricing
//   price: { type: Number, required: true, min: 0 },
  
//   // Categories
//   category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
//   subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
//   type: { type: Schema.Types.ObjectId, ref: 'Type', required: true },
//   brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
  
//   // Variants (Inventory Management)
//   variants: [variantSchema],
  
//   // Calculated fields
//   rating: { type: Number, default: 0, min: 0, max: 5 },
//   reviewCount: { type: Number, default: 0, min: 0 },
//   totalStock: { type: Number, default: 0, min: 0 },
//   minPrice: { type: Number, default: 0, min: 0 },
//   maxPrice: { type: Number, default: 0, min: 0 },
  
//   // Status
//   status: { 
//     type: String, 
//     enum: ['draft', 'active', 'inactive', 'discontinued'], 
//     default: 'draft' 
//   },
//   featured: { type: Boolean, default: false },
//   isDiscounted: { type: Boolean, default: false },
  
//   // Admin
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  
//   // Business
//   warranty: { type: String, trim: true },
//   returnPolicy: { type: String, trim: true },
//   shippingInfo: { type: String, trim: true },
//   tags: [{ type: String, trim: true }],
//   totalSales: { type: Number, default: 0, min: 0 },
//   viewCount: { type: Number, default: 0, min: 0 }
// }, { 
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // ================================
// // REVIEW SCHEMAS
// // ================================

// // Review Schema
// const reviewSchema = new Schema({
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//   user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   rating: { type: Number, required: true, min: 1, max: 5 },
//   title: { type: String, trim: true, maxlength: 100 },
//   review: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
//   verified: { type: Boolean, default: false },
//   helpful: { type: Number, default: 0 },
//   status: { 
//     type: String, 
//     enum: ['pending', 'approved', 'rejected'], 
//     default: 'pending' 
//   }
// }, { timestamps: true });

// // ================================
// // SHOPPING SCHEMAS
// // ================================

// // Wishlist Schema
// const wishlistSchema = new Schema({
//   user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
// }, { timestamps: true });

// // ShippingAddress Schema
// const shippingAddressSchema = new Schema({
//   fullname: { type: String, required: true, trim: true },
//   street: { type: String, required: true, trim: true },
//   city: { type: String, required: true, trim: true },
//   state: { type: String, required: true, trim: true },
//   postalCode: { type: String, required: true, trim: true },
//   country: { type: String, required: true, trim: true },
//   phone: { type: String, required: true, trim: true },
//   landmark: { type: String, trim: true },
//   user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
// }, { timestamps: true });

// // Cart Schema
// const cartSchema = new Schema({
//   qty: { type: Number, required: true, min: 1 },
//   productType: { type: String, trim: true },
//   productPrice: { type: Number, required: true, min: 0 },
//   totalPrice: { type: Number, required: true, min: 0 },
//   user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
// }, { timestamps: true });

// // ================================
// // ORDER SCHEMAS
// // ================================

// // Order Schema
// const orderSchema = new Schema({
//   totalPrice: { type: Number, required: true, min: 0 },
//   totalItem: { type: Number, required: true, min: 0 },
//   totalQty: { type: Number, required: true, min: 0 },
//   discountAmt: { type: Number, default: 0, min: 0 },
//   couponApplied: { type: String, trim: true },
//   paymentMethod: { type: String, enum: ['card', 'paypal', 'cod', 'other'], required: true },
//   paid: { type: Boolean, default: false },
//   status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
//   shippingAddress: { type: Schema.Types.ObjectId, ref: 'ShippingAddress', required: true },
//   user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
// }, { timestamps: true });

// // CartOrder Schema (Junction table for Order-Cart relationship)
// const cartOrderSchema = new Schema({
//   order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
//   cart: { type: Schema.Types.ObjectId, ref: 'Cart', required: true }
// }, { timestamps: true });

// // OrderStatus Schema (Order status history)
// const orderStatusSchema = new Schema({
//   statusTitle: { type: String, required: true, trim: true },
//   status: { type: String, required: true, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
//   message: { type: String, trim: true },
//   dateTime: { type: Date, default: Date.now },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
//   order: { type: Schema.Types.ObjectId, ref: 'Order', required: true }
// }, { timestamps: true });

// // ================================
// // INVENTORY & REPORTING SCHEMAS
// // ================================

// // InventoryLog Schema (Stock movement tracking)
// const inventoryLogSchema = new Schema({
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//   variantSku: { type: String, required: true, trim: true },
//   type: { type: String, enum: ['sale', 'restock', 'adjustment'], required: true },
//   quantity: { type: Number, required: true },
//   previousStock: { type: Number, required: true },
//   newStock: { type: Number, required: true },
//   orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
//   notes: { type: String, trim: true }
// }, { timestamps: true });

// // PriceLog Schema (Price change tracking)
// const priceLogSchema = new Schema({
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
//   variantSku: { type: String, required: true, index: true },
//   oldPrice: { type: Number, required: true },
//   newPrice: { type: Number, required: true },
//   changedAt: { type: Date, default: Date.now, index: true }
// }, { timestamps: false });

// // Sale Schema (Sales tracking)
// const saleSchema = new Schema({
//   orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
//   product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
//   variantSku: { type: String, required: true, index: true },
//   quantity: { type: Number, required: true, min: 1 },
//   salePrice: { type: Number, required: true },
//   totalLinePrice: { type: Number, required: true },
//   soldAt: { type: Date, default: Date.now, index: true }
// }, { timestamps: true });

// // ================================
// // CONTENT MANAGEMENT SCHEMAS
// // ================================

// // HeroContent Schema (Homepage carousel)
// const heroContentSchema = new Schema({
//   title: { type: String, required: true, trim: true },
//   image: { type: String, required: true, trim: true },
//   link: { type: String, trim: true },
//   status: { type: String, enum: ['active', 'inactive'], default: 'active' },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // AdsPanel Schema (Advertisement management)
// const adsPanelSchema = new Schema({
//   title: { type: String, required: true, trim: true },
//   image: { type: String, required: true, trim: true },
//   locationId: { type: String, required: true, trim: true },
//   link: { type: String, trim: true },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // CompanyInfo Schema (Company information)
// const companyInfoSchema = new Schema({
//   title: { type: String, required: true, trim: true },
//   description: { type: String, required: true },
//   email: { type: String, trim: true },
//   phone: { type: String, trim: true },
//   address: { type: String, trim: true },
//   website: { type: String, trim: true },
//   socialMedia: {
//     facebook: { type: String, trim: true },
//     twitter: { type: String, trim: true },
//     instagram: { type: String, trim: true },
//     linkedin: { type: String, trim: true }
//   },
//   businessHours: { type: String, trim: true },
//   logo: { type: String, trim: true },
//   status: { type: String, enum: ['active', 'inactive'], default: 'active' },
//   admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
// }, { timestamps: true });

// // ================================
// // MODEL EXPORTS
// // ================================

// // Create models
// const Admin = mongoose.model('Admin', adminSchema);
// const User = mongoose.model('User', userSchema);
// const Category = mongoose.model('Category', categorySchema);
// const SubCategory = mongoose.model('SubCategory', subCategorySchema);
// const Type = mongoose.model('Type', typeSchema);
// const Brand = mongoose.model('Brand', brandSchema);
// const SpecList = mongoose.model('SpecList', specListSchema);
// const Product = mongoose.model('Product', productSchema);
// const ProductSpecs = mongoose.model('ProductSpecs', productSpecsSchema);
// const Review = mongoose.model('Review', reviewSchema);
// const Wishlist = mongoose.model('Wishlist', wishlistSchema);
// const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);
// const Cart = mongoose.model('Cart', cartSchema);
// const Order = mongoose.model('Order', orderSchema);
// const CartOrder = mongoose.model('CartOrder', cartOrderSchema);
// const OrderStatus = mongoose.model('OrderStatus', orderStatusSchema);
// const HeroContent = mongoose.model('HeroContent', heroContentSchema);
// const AdsPanel = mongoose.model('AdsPanel', adsPanelSchema);
// const CompanyInfo = mongoose.model('CompanyInfo', companyInfoSchema);
// const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
// const PriceLog = mongoose.model('PriceLog', priceLogSchema);
// const Sale = mongoose.model('Sale', saleSchema);

// // Export all models
// module.exports = {
//   // User Management
//   Admin, 
//   User,
  
//   // Product Categorization
//   Category, 
//   SubCategory, 
//   Type, 
//   Brand,
  
//   // Product & Specifications
//   SpecList,
//   Product, 
//   ProductSpecs,
  
//   // Reviews & Ratings
//   Review,
  
//   // Shopping Experience
//   Wishlist, 
//   ShippingAddress, 
//   Cart,
  
//   // Order Management
//   Order, 
//   CartOrder,
//   OrderStatus,
  
//   // Content Management
//   HeroContent, 
//   AdsPanel, 
//   CompanyInfo,
  
//   // Inventory & Reporting
//   InventoryLog,
//   PriceLog,
//   Sale
// };