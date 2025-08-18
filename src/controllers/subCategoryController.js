const { Category, SubCategory, Type } = require('../models/parametersModel');

const subCategoryController = {
  // List all subcategories with their categories
  listSubCategories: async (req, res) => {
    try {
      const subcategories = await SubCategory.find({ admin: req.user._id })
        .populate('category', 'name')
        .populate('admin', 'username email')
        .sort({ name: 1 });
      
      // Get all categories for the dropdown in create/edit forms
      const categories = await Category.find({ admin: req.user._id }).sort({ name: 1 });
      
      res.render('subcategories/list', {
        subcategories,
        categories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching subcategories: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories');
    }
  },

  // Show form for new subcategory
  newSubCategory: async (req, res) => {
    try {
      const categories = await Category.find({ admin: req.user._id }).sort({ name: 1 });
      res.render('subcategories/new', {
        categories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading categories: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories');
    }
  },

  // Create a new subcategory
  createSubCategory: async (req, res) => {
    try {
      const { name, category } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const subcategory = await SubCategory.create({ 
        name, 
        slug,
        category,
        admin: req.user._id
      });
      
      req.flash('success', 'Subcategory created successfully');
      res.redirect('/admin/v1/parameters/subcategories');
    } catch (error) {
      console.error('Create subcategory error:', error);
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories/new');
    }
  },

  // Show single subcategory
  showSubCategory: async (req, res) => {
    try {
      const subcategory = await SubCategory.findById(req.params.id)
        .populate('category', 'name')
        .populate('admin', 'username email');
      
      if (!subcategory) {
        req.flash('error', 'Subcategory not found');
        return res.redirect('/admin/v1/parameters/subcategories');
      }

      res.render('subcategories/show', {
        subcategory,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching subcategory: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories');
    }
  },

  // Show edit form
  editSubCategory: async (req, res) => {
    try {
      const subcategory = await SubCategory.findById(req.params.id)
        .populate('category', 'name')
        .populate('admin', 'username email');

      if (!subcategory) {
        req.flash('error', 'Subcategory not found');
        return res.redirect('/admin/v1/parameters/subcategories');
      }

      const categories = await Category.find({ admin: req.user._id }).sort({ name: 1 });
      
      res.render('subcategories/edit', {
        subcategory,
        categories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching subcategory: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories');
    }
  },

  // Update subcategory
  updateSubCategory: async (req, res) => {
    try {
      const { name, category } = req.body;

      if (!name) {
        req.flash('error', 'Subcategory name is required');
        return res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
      }
      
      if (!category) {
        req.flash('error', 'Category is required');
        return res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
      }

      // Check if category exists and belongs to current admin
      const categoryExists = await Category.findOne({ _id: category, admin: req.user._id });
      if (!categoryExists) {
        req.flash('error', 'Selected category does not exist or access denied');
        return res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
      }

      // Case-insensitive unique validation within category and admin (excluding current)
      const existing = await SubCategory.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        category,
        admin: req.user._id,
        _id: { $ne: req.params.id }
      });
      
      if (existing) {
        req.flash('error', 'Subcategory name must be unique within this category');
        return res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      await SubCategory.findByIdAndUpdate(req.params.id, {
        name,
        slug,
        category,
        admin: req.user._id
      });

      req.flash('success', 'Subcategory updated successfully');
      res.redirect('/admin/v1/parameters/subcategories');
    } catch (error) {
      req.flash('error', 'Error updating subcategory: ' + error.message);
      res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
    }
  },

  // Delete subcategory (with type check)
  deleteSubCategory: async (req, res) => {
    try {
      const subcategoryId = req.params.id;
      
      // Check if subcategory exists and belongs to current admin
      const subcategory = await SubCategory.findOne({ _id: subcategoryId, admin: req.user._id });
      if (!subcategory) {
        req.flash('error', 'Subcategory not found or access denied');
        return res.redirect('/admin/v1/parameters/subcategories');
      }

      // Check for associated types belonging to current admin
      const typesCount = await Type.countDocuments({ subCategory: subcategoryId, admin: req.user._id });
      if (typesCount > 0) {
        req.flash('error', `Cannot delete subcategory with ${typesCount} associated types`);
        return res.redirect('/admin/v1/parameters/subcategories');
      }

      await SubCategory.findByIdAndDelete(subcategoryId);
      req.flash('success', 'Subcategory deleted successfully');
      res.redirect('/admin/v1/parameters/subcategories');
    } catch (error) {
      req.flash('error', 'Error deleting subcategory: ' + error.message);
      res.redirect('/admin/v1/parameters/subcategories');
    }
  },

  // Public API for subcategories
  getAllPublicSubCategories: async (req, res) => {
    try {
      const subcategories = await SubCategory.find()
        .select('name slug category createdAt')
        .populate('category', 'name slug')
        .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: subcategories.length,
        data: subcategories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // API to get subcategories by category (for frontend)
  getSubCategoriesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      const subcategories = await SubCategory.find({ category: categoryId })
        .select('name slug')
        .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: subcategories.length,
        data: subcategories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // API to get products by subcategory
  getProductsBySubCategory: async (req, res) => {
    try {
      const { subCategoryId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      
      const { Product } = require('../models/productModel');
      
      const [products, total] = await Promise.all([
        Product.find({ subCategory: subCategoryId, status: 'active' })
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .populate('type', 'name slug')
          .populate('brand', 'name slug')
          .select('-admin')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments({ subCategory: subCategoryId, status: 'active' })
      ]);
      
      // Add specifications to each product
      const { ProductSpecs } = require('../models/productModel');
      const productsWithSpecs = await Promise.all(
        products.map(async (product) => {
          const specifications = await ProductSpecs.find({ product: product._id })
            .populate('specList', 'title')
            .select('specList value');
          
          return {
            ...product.toObject(),
            specifications
          };
        })
      );
      
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        success: true,
        data: productsWithSpecs,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          totalProducts: total
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
};

module.exports = subCategoryController;