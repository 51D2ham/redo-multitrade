const mongoose = require('mongoose');
const { Schema } = mongoose;

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

const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);
module.exports = ShippingAddress;