const mongoose = require('mongoose');
const { Schema } = mongoose;

const adsPanelSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  locationId: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

const AdsPanel = mongoose.model('AdsPanel', adsPanelSchema);

module.exports = AdsPanel;