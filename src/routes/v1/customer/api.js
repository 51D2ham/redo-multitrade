const express = require('express');
const {
  registerAndSendOTP,
  verifyOTPAndRegister,
  sendRegistrationOTP,
  checkRegistrationStatus,
  resendRegistrationOTP,
  registerUser,
  loginUser,
  verifyToken,
  getCurrentUser,
  updateUser,
  deleteUser,
  changePassword,
  forgetPassword,
  resetPassword,
  logoutUser,
} = require('../../../controllers/customerRegister');

const upload = require('../../../middlewares/profilePhoto');
const authMiddleware = require('../../../middlewares/customerAuth');
const { 
  validateRegistrationOTP, 
  validateRegistration, 
  handleValidationErrors 
} = require('../../../middlewares/registrationValidation');

const router = express.Router();

// Token verification and user info
router.get('/verify-token', authMiddleware, verifyToken);
router.get('/me', authMiddleware, getCurrentUser);

// Protected API routes
router.put('/users/:id', authMiddleware, upload.single('profileImage'), updateUser);
router.put('/change-password', authMiddleware, changePassword);
router.delete('/users/:id', authMiddleware, deleteUser);

// Simple 2-step registration
router.post('/register', upload.single('profileImage'), registerAndSendOTP);
router.post('/verify-otp', verifyOTPAndRegister);

// Advanced OTP-based registration flow
router.post('/send-registration-otp', validateRegistrationOTP, handleValidationErrors, sendRegistrationOTP);
router.get('/registration-status', checkRegistrationStatus);
router.post('/resend-registration-otp', resendRegistrationOTP);
router.post('/register-with-otp', upload.single('profileImage'), validateRegistration, handleValidationErrors, registerUser);

// Auth & password reset (no auth)
router.post('/login', loginUser);
router.post('/forgot-password', forgetPassword);
router.post('/reset-password', resetPassword);

// Logout route
router.post('/logout',authMiddleware, logoutUser);

module.exports = router;