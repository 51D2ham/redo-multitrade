const mongoose = require('mongoose');
const { Schema } = mongoose;

const parameterPosterSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  parameterType: { 
    type: String, 
    required: true, 
    enum: ['category', 'brand'] 
  },
  parameterId: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

// Index for efficient queries
parameterPosterSchema.index({ parameterType: 1, parameterId: 1 });
parameterPosterSchema.index({ status: 1 });

const ParameterPoster = mongoose.model('ParameterPoster', parameterPosterSchema);

module.exports = ParameterPoster;