const express = require('express');
const User = require('../../../models/userRegisterModel');
const authMiddleware = require('../../../middlewares/auth');
const rbac = require('../../../middlewares/roleAccess');

const router = express.Router();

// Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.render('customer/index', { users });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load users.', error });
  }
});

// Get user profile
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.render('error', { message: 'User not found', error: {} });
    }
    res.render('customer/profile', { user });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load profile', error });
  }
});

// Show edit user form
router.get('/users/:id/edit', authMiddleware, rbac('developer', 'superAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.render('error', { message: 'User not found', error: {} });
    }
    res.render('customer/edit', { user });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to load edit page', error });
  }
});

// Update user
router.post('/users/:id/update', authMiddleware, rbac('developer', 'superAdmin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/admin/v1/customers/users/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to update user', error });
  }
});

// Delete user
router.post('/users/:id/delete', authMiddleware, rbac('developer', 'superAdmin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/v1/customers/users');
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Failed to delete user', error });
  }
});

module.exports = router;