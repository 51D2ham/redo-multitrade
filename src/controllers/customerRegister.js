const User = require('../models/userRegisterModel');
const bcrypt = require('bcrypt');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sendMail = require('../config/mail');
const path = require('path');
const { StatusCodes } = require('http-status-codes');
require('dotenv').config();

// Register User
const registerUser = async (req, res) => {
  try {
    const {
      username,
      email,
      fullname,
      phone,
      password,
      gender,
      dob,
      permanentAddress,
      tempAddress,
    } = req.body;

    const existingUsername = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    const existingPhone = await User.findOne({ phone });

    let errors = [];
    if (existingUsername) errors.push('Username already registered');
    if (existingEmail) errors.push('Email already registered');
    if (existingPhone) errors.push('Phone already registered');

    if (errors.length > 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: errors.join(', ') });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      username,
      email,
      fullname,
      phone,
      password: hashedPassword,
      gender,
      dob: new Date(dob),
      permanentAddress,
      tempAddress,
      ...(req.file && { profileImage: `/uploads/${req.file.filename}` }),
    };

    const newUser = new User(userData);
    await newUser.save();

    return res.status(StatusCodes.CREATED).json({ success: true, message: 'User registered successfully!' });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User doesn't exist" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Password' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, fullName: user.fullname, photo: user.profileImage, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '5d' }
    );

    res.status(200).json({ success: true, message: 'Logged in successfully', accessToken });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// OTP Generation
const generateOtp = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Forgot Password
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found. Please register." });
    }

    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    user.resOTP = otpCode;
    user.OTP_Expires = expiry;
    await user.save();

    const NotificationService = require('../services/notificationService');
    await NotificationService.sendPasswordResetEmail(email, user.fullname, otpCode);
    res.status(StatusCodes.OK).json({ success: true, message: "Password reset OTP sent to email." });
  } catch (error) {
    console.error('Mail error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to send OTP email.' });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found. Please register." });
    }

    const now = new Date();
    if (!user.resOTP || !user.OTP_Expires || user.resOTP !== otpCode || user.OTP_Expires < now) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid or expired OTP." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resOTP = undefined;
    user.OTP_Expires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(StatusCodes.OK).json({ success: true, message: "Password reset successfully!" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = { ...req.body };

    if (req.file) {
      const user = await User.findById(userId);
      if (user.profileImage && fs.existsSync(user.profileImage)) {
        fs.unlinkSync(user.profileImage);
      }
      updates.profileImage = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.profileImage && fs.existsSync(user.profileImage)) {
      fs.unlink(user.profileImage, err => {
        if (err) console.error('Error deleting photo:', err);
      });
    }

    await User.findByIdAndDelete(userId);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Send password changed notification
    try {
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendPasswordChangedEmail(user.email, user.fullname);
    } catch (emailError) {
      console.error('Password change email failed:', emailError);
    }

    res.status(200).json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// EJS Rendering Functions
const getAllUsersRender = async (req, res) => {
  try {
    let { search, sortBy, sortOrder, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    sortOrder = sortOrder === 'desc' ? -1 : 1;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortCriteria = {};
    if (sortBy) sortCriteria[sortBy] = sortOrder;

    const users = await User.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit);
    const totalUsers = await User.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      total: totalUsers,
      hasPrev: page > 1,
      hasNext: page < Math.ceil(totalUsers / limit),
    };

    res.render('customer/index', {
      users,
      pagination,
      filters: { search, sortBy, sortOrder },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load users.', error });
  }
};

const getUserProfileRender = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.render('error', { message: 'User not found', error: {} });
    }

    const permanentAddress = user.permanentAddress || '';
    const tempAddress = user.tempAddress || '';

    // Extract just the filename from the full path
    const photoFilename = user.profileImage ? path.basename(user.profileImage) : null;

    res.render('customer/profile', {
      user,
      permanentAddress,
      tempAddress,
      photoFilename 
    });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load profile', error });
  }
};

const showEditUserRender = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.render('error', { message: 'User not found', error: {} });
    }

    const permanentAddress = user.permanentAddress || '';
    const tempAddress = user.tempAddress || '';

    // Extract the photo filename
    const photoFilename = user.profileImage ? path.basename(user.profileImage) : null;

    res.render('customer/edit', {
      user,
      photoFilename, //the filename to the view
      permanentAddress,
      tempAddress
    });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load edit page', error });
  }
};

const updateUserRender = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = { ...req.body };

    if (req.file) {
      const user = await User.findById(userId);
      if (user.profileImage && fs.existsSync(user.profileImage)) fs.unlinkSync(user.profileImage);
      updates.profileImage = req.file.path;
    }

    await User.findByIdAndUpdate(userId, updates);
    res.redirect(`/admin/v1/customers/users/${userId}`);
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error(error);
    res.render('error', { message: 'Failed to update user', error });
  }
};

const deleteUserRender = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.render('error', { message: 'User not found', error: {} });
    }

    if (user.profileImage && fs.existsSync(user.profileImage)) {
      fs.unlink(user.profileImage, err => {
        if (err) console.error('Error deleting photo:', err);
      });
    }

    await User.findByIdAndDelete(userId);
    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to delete user', error });
  }
};

// Logout User
const logoutUser = async (req, res) => {
  try {
    const userId = req.userInfo.userId;

    // tokenVersion to invalidate all existing tokens
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });

    res.status(200).json({ success: true, message: 'Logged out successfully. Token invalidated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Logout failed. Try again.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  changePassword,
  forgetPassword,
  resetPassword,
  getAllUsersRender,
  getUserProfileRender,
  showEditUserRender,
  updateUserRender,
  deleteUserRender,
  logoutUser
};