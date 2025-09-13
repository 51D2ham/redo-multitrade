const express = require('express');
const multer = require('multer');
const {
  registerAndSendOTP,
  verifyOTPAndRegister,
  resendRegistrationOTP,
  loginUser,
  verifyToken,
  getCurrentUser,
  logoutUser,
  updateProfile,
  changePassword
} = require('../../../controllers/customerRegister');

const authMiddleware = require('../../../middlewares/customerAuth');
const upload = require('../../../middlewares/profilePhoto');

const router = express.Router();

// Registration flow
router.post('/register', multer().none(), registerAndSendOTP);
router.post('/verify-otp', multer().none(), verifyOTPAndRegister);
router.post('/resend-otp', multer().none(), resendRegistrationOTP);

// Authentication
router.post('/login', loginUser);
router.post('/logout', authMiddleware, logoutUser);

// Protected routes
router.get('/verify-token', authMiddleware, verifyToken);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/profile', authMiddleware, upload.single('profileImage'), updateProfile);
router.put('/change-password', authMiddleware, multer().none(), changePassword);



module.exports = router;