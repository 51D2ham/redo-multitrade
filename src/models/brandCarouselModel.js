const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandCarouselSchema = new Schema({
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, unique: true },
  order: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Unique constraints
brandCarouselSchema.index({ brand: 1 }, { unique: true });
brandCarouselSchema.index({ order: 1 }, { unique: true });
brandCarouselSchema.index({ status: 1, order: 1 });

const BrandCarousel = mongoose.model('BrandCarousel', brandCarouselSchema);

module.exports = BrandCarousel;