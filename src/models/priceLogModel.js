const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const PriceLogSchema = new Schema(
  {
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
    oldPrice: {
      type: Number,
      required: true
    },
    newPrice: {
      type: Number,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: false }
);

// Compound index so we can quickly find price changes by SKU + date:
PriceLogSchema.index({ variantSku: 1, changedAt: -1 });

module.exports = model('PriceLog', PriceLogSchema);
