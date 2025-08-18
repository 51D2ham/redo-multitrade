const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SaleSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    variantSku: {
      type: String,
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    salePrice: {
      type: Number,
      required: true
    },
    totalLinePrice: {
      type: Number,
      required: true
    },
    soldAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

SaleSchema.index({ product: 1, soldAt: -1 });

module.exports = model('Sale', SaleSchema);
