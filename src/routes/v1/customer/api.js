const express = require('express');
const {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  changePassword,
  forgetPassword,
  resetPassword,
  logoutUser,
  getCurrentUser,
} = require('../../../controllers/customerRegister');

const upload = require('../../../middlewares/profilePhoto');
const authMiddleware = require('../../../middlewares/customerAuth');

const router = express.Router();

// Protected API routes
router.put('/users/:id', authMiddleware, upload.single('profileImage'), updateUser);
router.put('/change-password', authMiddleware, changePassword);
router.delete('/users/:id', authMiddleware, deleteUser);

// Auth & password reset (no auth)
router.post('/register', upload.single('profileImage'), registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgetPassword);
router.post('/reset-password', resetPassword);

// Logout route
router.post('/logout',authMiddleware, logoutUser);

module.exports = router;