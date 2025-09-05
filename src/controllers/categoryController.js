// controllers/categoryController.js
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const mongoose = require('mongoose');

module.exports = {
  // ======================
  // PUBLIC API CONTROLLERS
  // ======================
  
  /**
   * @desc    Get all categories (public)
   * @route   GET /api/v1/categories
   * @access  Public
   */
  getAllPublicCategories: async (req, res) => {
    try {
      const categories = await Category.find()
        .select('name slug')
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  /**
   * @desc    Get full category hierarchy (public)
   * @route   GET /api/v1/categories/hierarchy
   * @access  Public
   */
  getCategoriesWithSubcategories: async (req, res) => {
    try {
      const categories = await Category.aggregate([
        {
          $lookup: {
            from: 'subcategories',
            localField: '_id',
            foreignField: 'category',
            as: 'subCategories'
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            subCategories: {
              $map: {
                input: '$subCategories',
                as: 'sub',
                in: {
                  _id: '$$sub._id',
                  name: '$$sub.name',
                  slug: '$$sub.slug'
                }
              }
            }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  /**
   * @desc    Get products by category (public)
   * @route   GET /api/v1/categories/:categoryId/products
   * @access  Public
   */
  getProductsByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const skip = (page - 1) * limit;
      
      // Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }
      
      const { Product } = require('../models/productModel');
      
      const filter = { category: categoryId, status: 'active' };
      
      // Add sorting
      let sort = { createdAt: -1 };
      switch (req.query.sort) {
        case 'price_asc': sort = { 'variants.price': 1 }; break;
        case 'price_desc': sort = { 'variants.price': -1 }; break;
        case 'rating': sort = { rating: -1 }; break;
        case 'newest': sort = { createdAt: -1 }; break;
      }
      
      const [products, total, category] = await Promise.all([
        Product.find(filter)
          .populate('brand', 'name')
          .select('_id title images variants rating reviewCount totalStock featured')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
        Category.findById(categoryId).select('name')
      ]);
      
      // Get specs for all products
      const { ProductSpecs } = require('../models/productModel');
      const productIds = products.map(p => p._id);
      const productSpecs = await ProductSpecs.find({ 
        product: { $in: productIds } 
      })
      .populate('specList', 'title')
      .select('product specList value')
      .sort({ 'specList.title': 1 });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      const categoryProducts = products.map(product => {
        const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
        const price = defaultVariant?.price || 0;
        const originalPrice = defaultVariant?.originalPrice || null;
        const isOnSale = !!(originalPrice && originalPrice > price);
        const discountPercent = isOnSale ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
        const thumbnail = product.images?.[0] ? `/uploads/products/${product.images[0]}` : null;
        
        // Get specs for this product (prioritized)
        const specPriority = ['RAM', 'Storage', 'Display', 'Processor', 'Battery', 'Camera', 'OS', 'Size', 'Weight'];
        const specs = productSpecs
          .filter(spec => spec.product.toString() === product._id.toString())
          .sort((a, b) => {
            const aIndex = specPriority.findIndex(p => a.specList?.title?.toLowerCase().includes(p.toLowerCase()));
            const bIndex = specPriority.findIndex(p => b.specList?.title?.toLowerCase().includes(p.toLowerCase()));
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
          })
          .slice(0, 3)
          .map(spec => ({
            title: spec.specList?.title || 'Unknown',
            value: spec.value
          }));
        
        return {
          _id: product._id,
          title: product.title,
          thumbnail,
          price,
          originalPrice,
          isOnSale,
          discountPercent,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          totalStock: product.totalStock || 0,
          featured: product.featured || false,
          category: {
            _id: category._id,
            name: category.name
          },
          brand: product.brand,
          specs: specs
        };
      });
      
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        success: true,
        data: {
          category,
          products: categoryProducts
        },
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          totalProducts: total
        }
      });
    } catch (error) {
      console.error('Get products by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // ========================
  // ADMIN DASHBOARD CONTROLLERS
  // ========================
  
  /**
   * @desc    Render category list (admin)
   * @route   GET /admin/categories
   * @access  Private/Admin
   */
  listCategories: async (req, res) => {
    try {
      const filters = req.query || {};
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
      
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        filter.name = searchRegex;
      }
      
      let sort = { createdAt: -1 };
      switch (filters.sort) {
        case 'oldest': sort = { createdAt: 1 }; break;
        case 'name_asc': sort = { name: 1 }; break;
        case 'name_desc': sort = { name: -1 }; break;
        case 'newest':
        default: sort = { createdAt: -1 }; break;
      }
      
      const [categories, total] = await Promise.all([
        Category.find(filter)
          .populate('admin', 'username email fullname')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Category.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);

      res.render('categories/list', {
        title: 'Manage Categories',
        categories: categories || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalCategories: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      console.error('Category list error:', error);
      req.flash('error', 'Error loading categories');
      
      res.render('categories/list', {
        title: 'Manage Categories',
        categories: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalCategories: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  /**
   * @desc    Render new category form (admin)
   * @route   GET /admin/categories/new
   * @access  Private/Admin
   */
  newCategory: (req, res) => {
    res.render('categories/new', {
      title: 'Create New Category',
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  /**
   * @desc    Create new category (admin)
   * @route   POST /admin/categories
   * @access  Private/Admin
   */
  createCategory: async (req, res) => {
    try {
      const { name } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const adminId = req.user && req.user._id ? req.user._id : req.session?.admin?.id;
      if (!adminId) {
        req.flash('error', 'Authentication required');
        return res.redirect('/admin/v1/staff/login');
      }
      
      const newCategory = await Category.create({
        name: name,
        slug: slug,
        admin: adminId
      });
      
      req.flash('success', 'Category created successfully');
      res.redirect('/admin/v1/parameters/categories');
    } catch (error) {
      console.error('Create category error:', error);
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/parameters/categories/new');
    }
  },

  /**
   * @desc    Show category details (admin)
   * @route   GET /admin/categories/:id
   * @access  Private/Admin
   */
  showCategory: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id)
        .populate('admin', 'username email fullname');

      if (!category) {
        req.flash('error', 'Category not found');
        return res.redirect('/admin/v1/parameters/categories');
      }

      // Get related subcategories
      const subCategories = await SubCategory.find({
        category: category._id
      }).populate('admin', 'username email fullname');

      res.render('categories/show', {
        title: 'Category Details',
        category,
        subcategories: subCategories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading category');
      res.redirect('/admin/v1/parameters/categories');
    }
  },

  /**
   * @desc    Render edit category form (admin)
   * @route   GET /admin/categories/:id/edit
   * @access  Private/Admin
   */
  editCategory: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        req.flash('error', 'Category not found');
        return res.redirect('/admin/v1/parameters/categories');
      }

      res.render('categories/edit', {
        title: 'Edit Category',
        category,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading category');
      res.redirect('/admin/v1/parameters/categories');
    }
  },

  /**
   * @desc    Update category (admin)
   * @route   PUT /admin/categories/:id
   * @access  Private/Admin
   */
  updateCategory: async (req, res) => {
    try {
      const { name, isActive, isFeatured } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const updateData = {
        name,
        slug,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true
      };

      // Handle file uploads
      if (req.files && req.files.icon) {
        updateData.icon = req.files.icon[0].filename;
      }

      await Category.findByIdAndUpdate(req.params.id, updateData);

      req.flash('success', 'Category updated successfully');
      res.redirect('/admin/v1/parameters/categories');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect(`/admin/v1/parameters/categories/${req.params.id}/edit`);
    }
  },

  /**
   * @desc    Delete category (admin)
   * @route   DELETE /admin/categories/:id
   * @access  Private/Admin
   */
  deleteCategory: async (req, res) => {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const categoryId = req.params.id;
        const adminId = req.user._id;

        // Delete category and its dependencies
        await Category.deleteOne({ _id: categoryId }).session(session);
        await SubCategory.deleteMany({ category: categoryId }).session(session);
        await Type.deleteMany({ category: categoryId }).session(session);

        await session.commitTransaction();
        req.flash('success', 'Category and all related data deleted');
        res.redirect('/admin/v1/parameters/categories');
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      req.flash('error', 'Error deleting category: ' + error.message);
      res.redirect(`/admin/v1/parameters/categories/${req.params.id}`);
    }
  }
};