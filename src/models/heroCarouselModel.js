const mongoose = require('mongoose');
const { Schema } = mongoose;

const heroContentSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

const HeroContent = mongoose.model('HeroContent', heroContentSchema);

module.exports = HeroContent;