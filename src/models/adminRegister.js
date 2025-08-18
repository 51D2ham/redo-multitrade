const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true,
     match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'] },
  fullname: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  profileImage: { type: String, trim: true,validate: {
      validator: function(v) {
        if (!v) return true; 
        return /\.(jpg|jpeg|png)$/i.test(v);
      },
      message: "Photo must be a valid image file (jpg, jpeg, png)"
    } },
  Address: { type: String, trim: true },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  role: { type: String, enum: ['admin', 'superadmin', 'developer'], default: 'admin' }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;