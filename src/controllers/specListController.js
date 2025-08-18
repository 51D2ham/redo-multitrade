const SpecList = require('../models/specListModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');

module.exports = {
  // PUBLIC API CONTROLLERS
  getAllPublicSpecLists: async (req, res) => {
    try {
      const specLists = await SpecList.find({ status: 'active' })
        .populate('category', 'name')
        .select('-admin')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: specLists.length,
        data: specLists
      });
    } catch (error) {
      console.error('Get public spec lists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // ADMIN DASHBOARD CONTROLLERS
  listSpecLists: async (req, res) => {
    try {
      const specLists = await SpecList.find({ admin: req.user._id })
        .populate('admin', 'username email fullname')
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name')
        .sort({ createdAt: -1 });

      res.render('specLists/list', {
        title: 'Manage Spec Lists',
        specLists,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('SpecList list error:', error);
      req.flash('error', 'Error loading spec lists');
      res.redirect('/admin/v1/staff/dashboard');
    }
  },

  newSpecList: async (req, res) => {
    try {
      const [categories, subCategories, types, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);
      
      res.render('specLists/new', {
        title: 'Create New Spec List',
        categories,
        subCategories,
        types,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Load new spec list form error:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  createSpecList: async (req, res) => {
    try {
      const { title, value, status, category, subCategory, type, brand } = req.body;
      
      // Validation
      if (!title || title.trim().length === 0) {
        req.flash('error', 'Spec title is required');
        return res.redirect('/admin/v1/parameters/spec-lists/new');
      }
      
      await SpecList.create({
        title: title.trim(),
        value: value ? value.trim() : '',
        status: status || 'active',
        category: category || null,
        subCategory: subCategory || null,
        type: type || null,
        brand: brand || null,
        admin: req.user._id
      });
      
      req.flash('success', 'Spec list created successfully');
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Create spec list error:', error);
      req.flash('error', 'Error creating spec list: ' + error.message);
      res.redirect('/admin/v1/parameters/spec-lists/new');
    }
  },

  showSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      
      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const specList = await SpecList.findOne({
        _id: specListId,
        admin: req.user._id
      }).populate('admin', 'username email fullname')
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name');

      if (!specList) {
        req.flash('error', 'Spec list not found');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      res.render('specLists/show', {
        title: 'Spec List Details',
        specList,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Show spec list error:', error);
      req.flash('error', 'Error loading spec list');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  editSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      
      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const specList = await SpecList.findOne({
        _id: specListId,
        admin: req.user._id
      });

      if (!specList) {
        req.flash('error', 'Spec list not found');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const [categories, subCategories, types, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);

      res.render('specLists/edit', {
        title: 'Edit Spec List',
        specList,
        categories,
        subCategories,
        types,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Edit spec list error:', error);
      req.flash('error', 'Error loading spec list');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  updateSpecList: async (req, res) => {
    try {
  const specListId = req.params.id;
  const { title, value, status, category, subCategory, type, brand } = req.body;
  // Checkbox: if present, true; if missing, false
  const displayInFilter = req.body.displayInFilter === 'on' || req.body.displayInFilter === 'true';

      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      // Validation
      if (!title || title.trim().length === 0) {
        req.flash('error', 'Spec title is required');
        return res.redirect(`/admin/v1/parameters/spec-lists/${specListId}/edit`);
      }

      const updatedSpecList = await SpecList.findOneAndUpdate(
        { _id: specListId, admin: req.user._id },
        {
          title: title.trim(),
          value: value ? value.trim() : '',
          status: status || 'active',
          category: category || null,
          subCategory: subCategory || null,
          type: type || null,
          brand: brand || null,
          displayInFilter
        },
        { new: true, runValidators: true }
      );

      if (!updatedSpecList) {
        req.flash('error', 'Spec list not found or you do not have permission to update it');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      req.flash('success', 'Spec list updated successfully');
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Update spec list error:', error);
      req.flash('error', 'Error updating spec list: ' + error.message);
      res.redirect(`/admin/v1/parameters/spec-lists/${req.params.id}/edit`);
    }
  },

  deleteSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      const adminId = req.user._id;

      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const deletedSpec = await SpecList.findOneAndDelete({ 
        _id: specListId, 
        admin: adminId 
      });
      
      if (!deletedSpec) {
        req.flash('error', 'Spec list not found or you do not have permission to delete it');
      } else {
        req.flash('success', 'Spec list deleted successfully');
      }
      
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Delete spec list error:', error);
      req.flash('error', 'Error deleting spec list: ' + error.message);
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  }
};