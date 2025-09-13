const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, trim: true, sparse: true, index: { unique: true, sparse: true } },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  fullname: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, sparse: true, index: { unique: true, sparse: true } },
  password: { type: String, required: true, minlength: 8 },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  dob: { type: Date, default: () => new Date('1990-01-01') },
  profileImage: { type: String, trim: true },
  permanentAddress: { type: String, trim: true },
  tempAddress: { type: String, trim: true },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  otpRequestedAt: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);