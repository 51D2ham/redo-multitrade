// models/parametersModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Category schema
const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// SubCategory schema
const subCategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Type schema
const typeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Brand schema
const brandSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Export all models
module.exports = {
  Category: mongoose.model('Category', categorySchema),
  SubCategory: mongoose.model('SubCategory', subCategorySchema),
  Type: mongoose.model('Type', typeSchema),
  Brand: mongoose.model('Brand', brandSchema)
};