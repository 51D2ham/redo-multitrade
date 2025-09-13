const User = require('../models/userRegisterModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const generateOtp = require('../utils/generateOtp');
const NotificationService = require('../services/notificationService');

// Rate limiting helper
const checkOTPRateLimit = async (email) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Count OTP requests in last hour
  const otpCount = await User.countDocuments({
    email,
    otpRequestedAt: { $gte: oneHourAgo }
  });
  
  if (otpCount >= 3) {
    return {
      allowed: false,
      message: 'Too many OTP requests. Please try again after 1 hour.'
    };
  }
  
  return { allowed: true };
};

// Register and Send OTP
const registerAndSendOTP = async (req, res) => {
  try {
    const { email, password, fullname } = req.body;
    
    if (!email || !password || !fullname) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Email, password, and fullname are required' 
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    if (password.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    const existingUser = await User.findOne({ email, isEmailVerified: true });
    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Check for existing unverified user
    const existingUnverified = await User.findOne({ email, isEmailVerified: false });
    if (existingUnverified) {
      // Check if OTP is still valid
      if (existingUnverified.OTP_Expires && new Date() < existingUnverified.OTP_Expires) {
        return res.status(StatusCodes.OK).json({
          success: true,
          action: 'verify_existing',
          message: 'Account exists. Please check your email for OTP or use resend option.',
          canResend: false
        });
      } else {
        // OTP expired, allow resend
        return res.status(StatusCodes.OK).json({
          success: true,
          action: 'resend_required',
          message: 'Account exists but OTP expired. Please use resend OTP.',
          canResend: true
        });
      }
    }

    // Rate limiting check for new registrations only
    const rateLimitCheck = await checkOTPRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: rateLimitCheck.message
      });
    }

    // Clean up expired unverified users (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await User.deleteMany({ 
      email, 
      isEmailVerified: false,
      createdAt: { $lt: oneHourAgo }
    });

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 12);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      email,
      password: hashedPassword,
      fullname: fullname.trim(),
      isEmailVerified: false,
      resOTP: otp,
      OTP_Expires: otpExpires,
      status: 'inactive',
      otpRequestedAt: new Date()
    });

    await newUser.save();
    await NotificationService.sendEmailVerification(email, fullname, otp);

    return res.status(StatusCodes.OK).json({ 
      success: true,
      action: 'new_registration',
      message: 'OTP sent to your email. Valid for 10 minutes.',
      canResend: true
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
};

// Verify OTP and Complete Registration
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Email and OTP required' 
      });
    }

    const user = await User.findOne({ email, isEmailVerified: false });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        success: false, 
        message: 'Registration session expired. Please register again.' 
      });
    }

    if (new Date() > user.OTP_Expires) {
      await User.deleteOne({ email, isEmailVerified: false });
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'OTP expired. Please register again.' 
      });
    }

    if (!user.resOTP || user.resOTP.toLowerCase() !== otp.toString().trim().toLowerCase()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Invalid OTP'
      });
    }

    user.isEmailVerified = true;
    user.status = 'active';
    user.resOTP = undefined;
    user.OTP_Expires = undefined;
    await user.save();

    try {
      await NotificationService.sendWelcomeEmail(user.email, user.fullname);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    return res.status(StatusCodes.OK).json({ 
      success: true, 
      message: 'Registration completed successfully!',
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Server error. Please try again later.'
    });
  }
};

// Resend OTP
const resendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Email required'
      });
    }

    // Rate limiting check
    const rateLimitCheck = await checkOTPRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: rateLimitCheck.message
      });
    }

    const user = await User.findOne({ email, isEmailVerified: false });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found or already verified'
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resOTP = otp;
    user.OTP_Expires = otpExpires;
    user.otpRequestedAt = new Date();
    await user.save();

    await NotificationService.sendEmailVerification(email, user.fullname, otp);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'New OTP sent'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to resend OTP' 
    });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    const user = await User.findOne({ 
      email, 
      isEmailVerified: true,
      status: 'active'
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        tokenVersion: user.tokenVersion || 0
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    return res.status(StatusCodes.OK).json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
};

// Verify Token
const verifyToken = async (req, res) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.userInfo.userId,
      email: req.userInfo.email
    }
  });
};

// Get Current User
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userInfo.userId).select('-password -resOTP -OTP_Expires');
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to get user' 
    });
  }
};

// Logout
const logoutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.userInfo.userId,
      { $inc: { tokenVersion: 1 } }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { fullname, phone, gender, dob } = req.body;
    const userId = req.userInfo.userId;

    const updateData = {};
    if (fullname) updateData.fullname = fullname;
    if (phone) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (dob) updateData.dob = new Date(dob);
    if (req.file) updateData.profileImage = req.file.filename;
    if (req.file) updateData.profileImage = req.file.filename;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -resOTP -OTP_Expires -tokenVersion');

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Profile update failed'
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userInfo.userId;

    if (!currentPassword || !newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(userId);
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(userId, { 
      password: hashedNewPassword,
      tokenVersion: user.tokenVersion + 1 // Invalidate existing tokens
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Password change failed'
    });
  }
};

module.exports = {
  registerAndSendOTP,
  verifyOTPAndRegister,
  resendRegistrationOTP,
  loginUser,
  verifyToken,
  getCurrentUser,
  logoutUser,
  updateProfile,
  changePassword
};