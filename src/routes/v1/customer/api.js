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
const { csrfProtection, sanitizeInput, createRateLimit } = require('../../../middlewares/security');

const router = express.Router();

// Apply security middleware
router.use(sanitizeInput);
router.use(createRateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

// Token verification and user info
router.get('/verify-token', authMiddleware, verifyToken);
router.get('/me', authMiddleware, getCurrentUser);

// Protected API routes
router.put('/users/:id', authMiddleware, upload.single('profileImage'), updateUser);
router.put('/change-password', authMiddleware, changePassword);
router.delete('/users/:id', authMiddleware, deleteUser);

// Simple 2-step registration
router.post('/register', csrfProtection, upload.single('profileImage'), registerAndSendOTP);
router.post('/verify-otp', csrfProtection, verifyOTPAndRegister);

// Advanced OTP-based registration flow
router.post('/send-registration-otp', csrfProtection, validateRegistrationOTP, handleValidationErrors, sendRegistrationOTP);
router.get('/registration-status', checkRegistrationStatus);
router.post('/resend-registration-otp', csrfProtection, resendRegistrationOTP);
router.post('/register-with-otp', csrfProtection, upload.single('profileImage'), validateRegistration, handleValidationErrors, registerUser);

// Auth & password reset (no auth)
router.post('/login', csrfProtection, loginUser);
router.post('/forgot-password', csrfProtection, forgetPassword);
router.post('/reset-password', csrfProtection, resetPassword);

// Logout route
router.post('/logout',authMiddleware, logoutUser);

module.exports = router;