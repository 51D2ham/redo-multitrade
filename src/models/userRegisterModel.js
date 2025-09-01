const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'] },
  fullname: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 8,message: "Must be of 8 variables" },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dob: { type: Date, required: true },
  profileImage: { type: String, trim: true,validate: {
      validator: function(v) {
        if (!v) return true; 
        return /\.(jpg|jpeg|png)$/i.test(v);
      },
      message: "Photo must be a valid image file (jpg, jpeg, png)"
    } },
  permanentAddress: { type: String, trim: true },
  tempAddress: { type: String, trim: true },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  registrationOTP: { type: String },
  registrationOTPExpires: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;