const mongoose = require('mongoose');
const { Schema } = mongoose;

const companyInfoSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  website: { type: String, trim: true },
  socialMedia: {
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    instagram: { type: String, trim: true },
    linkedin: { type: String, trim: true }
  },
  businessHours: { type: String, trim: true },
  logo: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

const CompanyInfo = mongoose.model('CompanyInfo', companyInfoSchema);

module.exports = CompanyInfo;

