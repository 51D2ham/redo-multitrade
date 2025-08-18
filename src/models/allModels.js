const mongoose = require('mongoose');
const { Schema } = mongoose;

// Admin Schema
const adminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  fullname: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dob: { type: Date, required: true },
  profileImage: { type: String, trim: true },
  permanentAddress: { type: String, trim: true },
  tempAddress: { type: String, trim: true },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  tokenVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' }
}, { timestamps: true });

// User Schema
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  fullname: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dob: { type: Date, required: true },
  profileImage: { type: String, trim: true },
  permanentAddress: { type: String, trim: true },
  tempAddress: { type: String, trim: true },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  tokenVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

// Category Schema
const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// SubCategory Schema
const subCategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Type Schema
const typeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Brand Schema
const brandSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// SpecList Schema
const specListSchema = new Schema({
  title: { type: String, required: true, trim: true },
  value: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  type: { type: Schema.Types.ObjectId, ref: 'Type' },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Product Schema
const productSchema = new Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  images: [{ type: String, trim: true }],
  price: { type: Number, required: true, min: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  type: { type: Schema.Types.ObjectId, ref: 'Type', required: true },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true }
}, { timestamps: true });

// ProductSpecs Schema
const productSpecsSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  specList: { type: Schema.Types.ObjectId, ref: 'SpecList', required: true },
  value: { type: String, required: true, trim: true }
}, { timestamps: true });

// ProductInventory Schema
const productInventorySchema = new Schema({
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  discountPrice: { type: Number, min: 0 },
  qty: { type: Number, required: true, min: 0 },
  thresholdQty: { type: Number, min: 0 },
  status: { type: String, enum: ['in_stock', 'out_of_stock', 'low_stock'], default: 'in_stock' },
  shipping: { type: Boolean, default: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  type: { type: Schema.Types.ObjectId, ref: 'Type' },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand' }
}, { timestamps: true });

// Review Schema
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, required: true, trim: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Wishlist Schema
const wishlistSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: true });

// ShippingAddress Schema
const shippingAddressSchema = new Schema({
  fullname: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Cart Schema
const cartSchema = new Schema({
  qty: { type: Number, required: true, min: 1 },
  productType: { type: String, trim: true },
  productPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: true });

// Order Schema
const orderSchema = new Schema({
  totalPrice: { type: Number, required: true, min: 0 },
  totalItem: { type: Number, required: true, min: 0 },
  totalQty: { type: Number, required: true, min: 0 },
  discountAmt: { type: Number, default: 0, min: 0 },
  couponApplied: { type: String, trim: true },
  paymentMethod: { type: String, enum: ['card', 'paypal', 'cod', 'other'], required: true },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: { type: Schema.Types.ObjectId, ref: 'ShippingAddress', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// CartOrder Schema
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

// HeroContent Schema
const heroContentSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// AdsPanel Schema
const adsPanelSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  locationId: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// SystemInfo Schema
const systemInfoSchema = new Schema({
  description: { type: String, required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Export models
const Admin = mongoose.model('Admin', adminSchema);
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const SubCategory = mongoose.model('SubCategory', subCategorySchema);
const Type = mongoose.model('Type', typeSchema);
const Brand = mongoose.model('Brand', brandSchema);
const SpecList = mongoose.model('SpecList', specListSchema);
const Product = mongoose.model('Product', productSchema);
const ProductSpecs = mongoose.model('ProductSpecs', productSpecsSchema);
const ProductInventory = mongoose.model('ProductInventory', productInventorySchema);
const Review = mongoose.model('Review', reviewSchema);
const Wishlist = mongoose.model('Wishlist', wishlistSchema);
const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);
const CartOrder = mongoose.model('CartOrder', cartOrderSchema);
const OrderStatus = mongoose.model('OrderStatus', orderStatusSchema);
const HeroContent = mongoose.model('HeroContent', heroContentSchema);
const AdsPanel = mongoose.model('AdsPanel', adsPanelSchema);
const SystemInfo = mongoose.model('SystemInfo', systemInfoSchema);

module.exports = {
  Admin, User, Category, SubCategory, Type, Brand, SpecList, Product, ProductSpecs,
  ProductInventory, Review, Wishlist, ShippingAddress, Cart, Order, CartOrder,
  OrderStatus, HeroContent, AdsPanel, SystemInfo
};