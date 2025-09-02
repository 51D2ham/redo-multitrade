const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandCarouselSchema = new Schema({
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Index for efficient queries
brandCarouselSchema.index({ status: 1, order: 1 });
brandCarouselSchema.index({ brand: 1 });

const BrandCarousel = mongoose.model('BrandCarousel', brandCarouselSchema);

module.exports = BrandCarousel;