const Admin = require('../models/adminRegister'); 
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const sendMail = require('../config/mail');
const moment = require('moment-timezone');
const generateOtp = require('../utils/generateOtp');
const InventoryService = require('../services/inventoryService');


// Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { username, fullname, email, password, phone, gender, Address, role } = req.body;

    // Check if admin already exists
    const existingUsername = await Admin.findOne({ username });
    const existingEmail = await Admin.findOne({ email });
    const existingPhone = await Admin.findOne({ phone });

    let errors = [];
    if (existingUsername) errors.push('Username already registered');
    if (existingEmail) errors.push('Email already registered');
    if (existingPhone) errors.push('Phone already registered');

    if (errors.length > 0) {
      if (req.file) {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      }
      req.flash('error', errors.join(', '));
      return res.redirect('/admin/v1/staff/register');
    }

    // Validate required fields
    if (!username || !fullname || !email || !password || !phone || !gender || !role) {
      if (req.file) {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      }
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/admin/v1/staff/register');
    }

    // Validate enum values
    const validGenders = ['male', 'female', 'other'];
    const validRoles = ['admin', 'superadmin', 'developer'];
    
    if (!validGenders.includes(gender.toLowerCase())) {
      if (req.file) {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      }
      req.flash('error', 'Invalid gender selected');
      return res.redirect('/admin/v1/staff/register');
    }
    
    if (!validRoles.includes(role.toLowerCase())) {
      if (req.file) {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      }
      req.flash('error', 'Invalid role selected');
      return res.redirect('/admin/v1/staff/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminData = {
      username,
      fullname,
      email,
      password: hashedPassword,
      phone,
      gender: gender.toLowerCase(),
      Address: Address || '',
      role: role.toLowerCase(),
      ...(req.file && { profileImage: req.file.filename }),
      status: 'active' // Default status
    };

    const newAdmin = new Admin(adminData);
    await newAdmin.save();

    req.flash('success', 'Admin registered successfully');
    res.redirect('/admin/v1/staff/');
  } catch (error) {
    if (req.file) {
      try {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    console.error('Register Admin Error:', error);
    req.flash('error', 'Server error. Please try again later.');
    res.redirect('/admin/v1/staff/register');
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      req.flash('error', "Admin doesn't exist");
      return res.redirect('/admin/v1/staff/login');
    }
    
    // Check if account is active
    if (admin.status !== 'active') {
      req.flash('error', `Account is ${admin.status}. Please contact system administrator.`);
      return res.redirect('/admin/v1/staff/login');
    }

    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      req.flash('error', 'Invalid Password');
      return res.redirect('/admin/v1/staff/login');
    }
    
    req.session.regenerate((err) => {
      if (err) {
        req.flash('error', 'Session error');
        return res.redirect('/admin/v1/staff/login');
      }
      
      req.session.admin = { 
        id: admin._id, 
        username: admin.username,
        fullname: admin.fullname,
        role: admin.role,
        status: admin.status
      };
      
      req.session.ip = req.ip;
      req.session.userAgent = req.headers['user-agent'];
      
      // Ensure session is saved before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          req.flash('error', 'Login session error');
          return res.redirect('/admin/v1/staff/login');
        }
        req.flash('success', 'Logged in successfully');
        res.redirect('/admin/v1/staff/dashboard');
      });
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error. Please try again later.');
    res.redirect('/admin/v1/staff/login');
  }
};

// Change Password
const changePasswordRender = async (req, res) => {
  try {
    const adminId = req.session.admin.id; 
    const { oldPassword, newPassword } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/v1/staff/change-password');
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      req.flash('error', 'Old password is incorrect');
      return res.redirect('/admin/v1/staff/change-password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    // Send password changed notification
    try {
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendPasswordChangedEmail(admin.email, admin.fullname, true);
    } catch (emailError) {
      console.error('Password change email failed:', emailError);
    }

    req.flash('success', 'Password changed successfully');
    res.redirect('/admin/v1/staff/profile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error. Please try again later.');
    res.redirect('/admin/v1/staff/change-password');
  }
};

// Forgot Password
const forgotPasswordRender = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      req.flash('error', 'Email not found');
      return res.redirect('/admin/v1/staff/forgot-password');
    }

    // Check if account is active
    if (admin.status !== 'active') {
      req.flash('error', `Account is ${admin.status}. Please contact system administrator.`);
      return res.redirect('/admin/v1/staff/forgot-password');
    }

    const otp = generateOtp();
    admin.resOTP = otp;
    admin.OTP_Expires = Date.now() + 5 * 60 * 1000;
    await admin.save();

    const NotificationService = require('../services/notificationService');
    await NotificationService.sendPasswordResetEmail(email, admin.fullname, otp, true);

    req.flash('success', 'OTP sent to your email');
    res.redirect(`/admin/v1/staff/reset-password?email=${email}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error sending OTP. Please try again.');
    res.redirect('/admin/v1/staff/forgot-password');
  }
};

// Reset Password
const resetPasswordRender = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect(`/admin/v1/staff/reset-password?email=${email}`);
    }

    if (!admin.resOTP || admin.resOTP !== otpCode || admin.OTP_Expires < Date.now()) {
      req.flash('error', 'Invalid or expired OTP');
      return res.redirect(`/admin/v1/staff/reset-password?email=${email}`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    admin.resOTP = undefined;
    admin.OTP_Expires = undefined;
    await admin.save();

    req.flash('success', 'Password reset successfully');
    res.redirect('/admin/v1/staff/login');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error resetting password');
    res.redirect(`/admin/v1/staff/reset-password?email=${email}`);
  }
};

// Get All Admins
const getAllAdminsRender = async (req, res) => {
  try {
    let { search, role, sortBy, sortOrder, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    sortOrder = sortOrder === 'desc' ? -1 : 1;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role.toLowerCase();

    const sortCriteria = {};
    if (sortBy) sortCriteria[sortBy] = sortOrder;

    const admins = await Admin.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalAdmins = await Admin.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalAdmins / limit),
      hasPrev: page > 1,
      hasNext: page < Math.ceil(totalAdmins / limit),
      startIndex: (page - 1) * limit,
      endIndex: Math.min(page * limit, totalAdmins),
      total: totalAdmins
    };

    res.render('admin/index', {
      admins,
      pagination,
      filters: { search, role, sortBy, sortOrder },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load admins');
    res.redirect('/admin/v1/staff');
  }
};

// Get Admin Profile
const getAdminProfileRender = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).lean();
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/v1/staff');
    }
    
    // Extract just the filename from the full path
    const photoFilename = admin.profileImage ? path.basename(admin.profileImage) : null;
    
    res.render('admin/profile', {
      admin,
      photoFilename
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/admin/v1/staff');
  }
};

// Show Edit Admin Page
const showEditAdminRender = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).lean();
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/v1/staff');
    }
    
    // Extract just the filename from the full path
    const photoFilename = admin.profileImage ? path.basename(admin.profileImage) : null;
    
    res.render('admin/edit', {
      admin,
      photoFilename
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load edit page');
    res.redirect('/admin/v1/staff');
  }
};

// Update Admin Details
const updateAdminRender = async (req, res) => {
  try {
    const adminId = req.params.id;
    const updates = { ...req.body };

    const admin = await Admin.findById(adminId);
    if (!admin) {
      if (req.file) {
      const safePath = path.resolve(req.file.path);
      if (safePath.startsWith(path.resolve('./src/uploads'))) {
        await fs.unlink(safePath);
      }
    }
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/v1/staff');
    }

    // Handle profile image
    if (req.file) {
      // Delete old image if exists
      if (admin.profileImage) {
        const oldImagePath = path.resolve(path.join(__dirname, '..', 'public', admin.profileImage));
        const allowedDir = path.resolve('./src/uploads');
        if (oldImagePath.startsWith(allowedDir)) {
          try {
            await fs.access(oldImagePath);
            await fs.unlink(oldImagePath);
          } catch (err) {
            console.error('Error deleting old profile image:', err);
          }
        }
      }
      
      // Set new image path
      updates.profileImage = req.file.filename;
    }

    // Convert role and gender to lowercase to match enum
    if (updates.role) updates.role = updates.role.toLowerCase();
    if (updates.gender) updates.gender = updates.gender.toLowerCase();

    // Update admin
    await Admin.findByIdAndUpdate(adminId, updates, { new: true, runValidators: true });
    
    req.flash('success', 'Admin updated successfully');
    res.redirect(`/admin/v1/staff/${adminId}/profile`);
  } catch (error) {
    if (req.file) {
      try {
        const safePath = path.resolve(req.file.path);
        if (safePath.startsWith(path.resolve('./src/uploads'))) {
          await fs.unlink(safePath);
        }
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    console.error('Update Admin Error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      req.flash('error', messages.join(', '));
    } else {
      req.flash('error', 'Failed to update admin');
    }
    
    res.redirect(`/admin/v1/staff/${req.params.id}/edit`);
  }
};

// Delete Admin
const deleteAdminRender = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/v1/staff');
    }

    // Delete profile image if exists
    if (admin.profileImage) {
      const imagePath = path.resolve(path.join(__dirname, '..', 'public', admin.profileImage));
      const allowedDir = path.resolve('./src/uploads');
      if (imagePath.startsWith(allowedDir)) {
        try {
          await fs.access(imagePath);
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting profile image:', err);
        }
      }
    }

    await Admin.findByIdAndDelete(adminId);
    req.flash('success', 'Admin deleted successfully');
    res.redirect('/admin/v1/staff');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete admin');
    res.redirect('/admin/v1/staff');
  }
};

// logout
const logoutAdmin = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Logout failed');
    }
    
    // Clear the session cookie
    res.clearCookie(
      'multitrade.sid', 
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      }
    );
    
    res.redirect('/admin/v1/staff/login');
  });
};



// Clean expired OTPs
setInterval(async () => {
  try {
    const now = new Date();
    const result = await Admin.updateMany(
      { OTP_Expires: { $lt: now } },
      { $unset: { resOTP: "", OTP_Expires: "" } }
    );
    console.log(`OTP CLEANING... ${result.modifiedCount} expired OTPs removed at ${now.toLocaleString()}`);
  } catch (error) {
    console.error('[OTP Cleanup Error]', error.message);
  }
}, 24 * 60 * 60 * 1000); // 24hrs interval

const isAuthenticated = (req, res, next) => {
  if (req.session.admin) {
    // Check if account is still active
    if (req.session.admin.status !== 'active') {
      req.flash('error', `Your account is ${req.session.admin.status}. Please contact system administrator.`);
      req.session.destroy();
      res.clearCookie('multitrade.sid');
      return res.redirect('/admin/v1/staff/login');
    }
    return next();
  }
  
  req.flash('error', 'Please login to access the dashboard');
  res.redirect('/admin/v1/staff/login');
};

// Dashboard Controller
const renderDashboard = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.admin.id).select('username fullname email role status');
    if (!admin) {
      req.session.destroy();
      res.clearCookie('multitrade.sid');
      req.flash('error', 'Admin not found. Please login again');
      return res.redirect('/admin/v1/staff/login');
    }

    // Update session with fresh data
    req.session.admin = { 
      id: admin._id, 
      username: admin.username,
      fullname: admin.fullname,
      role: admin.role,
      status: admin.status
    };

    const nepalTime = moment().tz('Asia/Kathmandu');
    const today = nepalTime.format('YYYY-MM-DD');
    const day = nepalTime.format('dddd');
    const time = nepalTime.format('HH:mm:ss');

    // Fetch dashboard statistics
    const User = require('../models/userRegisterModel');
    const { Order } = require('../models/orderModel');
    const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
    
    const todayStart = moment().tz('Asia/Kathmandu').startOf('day').toDate();
    const todayEnd = moment().tz('Asia/Kathmandu').endOf('day').toDate();
    
    const { Product } = require('../models/productModel');
    
    const [stats, inventoryData] = await Promise.all([
      Promise.all([
        Admin.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'active' }),
        Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
        Category.countDocuments(),
        SubCategory.countDocuments(),
        Type.countDocuments(),
        Brand.countDocuments(),
        Product.countDocuments({ status: 'active' }),
        Order.aggregate([
          { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ])
      ]),
      InventoryService.getDashboardData().catch(() => ({ lowStockCount: 0, criticalStockCount: 0, recentMovements: [] }))
    ]);
    
    const [totalAdmins, totalUsers, todayOrders, totalCategories, totalSubCategories, totalTypes, totalBrands, totalProducts, todayRevenue] = stats;
    
    res.render('admin/dashboard', {
      username: admin.username,
      fullname: admin.fullname,
      email: admin.email,
      role: admin.role,
      today,
      day,
      time,
      stats: {
        totalAdmins,
        totalUsers,
        todayOrders,
        totalProducts,
        totalCategories,
        totalSubCategories,
        totalTypes,
        totalBrands,
        todayRevenue: todayRevenue[0]?.total || 0
      },
      inventory: inventoryData
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/admin/v1/staff/login');
  }
};

const renderParameterDashboard = async (req, res) => {
  try {
    const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
    const { Product } = require('../models/productModel');
    const SpecList = require('../models/specListModel');
    
    const [categoriesCount, subCategoriesCount, typesCount, brandsCount, productsCount, specListsCount] = await Promise.all([
      Category.countDocuments(),
      SubCategory.countDocuments(),
      Type.countDocuments(),
      Brand.countDocuments(),
      Product.countDocuments(),
      SpecList.countDocuments()
    ]);

    res.render('admin/parameter_dashboard', {
      title: 'Parameter Dashboard',
      username: req.session.admin?.username || null,
      fullname: req.session.admin?.fullname || null,
      counts: {
        categories: categoriesCount,
        subcategories: subCategoriesCount,
        types: typesCount,
        brands: brandsCount,
        products: productsCount,
        specLists: specListsCount
      }
    });
  } catch (error) {
    console.error('Parameter dashboard error:', error);
    res.render('admin/parameter_dashboard', {
      title: 'Parameter Dashboard',
      username: req.session.admin?.username || null,
      fullname: req.session.admin?.fullname || null,
      counts: { categories: 0, subcategories: 0, types: 0, brands: 0, products: 0, specLists: 0 }
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAllAdminsRender,
  getAdminProfileRender,
  showEditAdminRender,
  updateAdminRender,
  deleteAdminRender,
  changePasswordRender,
  forgotPasswordRender,
  resetPasswordRender,
  logoutAdmin,
  renderDashboard,
  renderParameterDashboard,
  isAuthenticated
};