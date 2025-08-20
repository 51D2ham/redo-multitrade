const { Category, SubCategory, Type } = require('../models/parametersModel');

const typeController = {
  // List all types with their categories and subcategories
  listTypes: async (req, res) => {
    try {
      const filters = req.query || {};
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (req.user && req.user._id) {
        filter.admin = req.user._id;
      }
      
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        filter.name = searchRegex;
      }
      
      if (filters.category) {
        filter.category = filters.category;
      }
      
      if (filters.subCategory) {
        filter.subCategory = filters.subCategory;
      }
      
      let sort = { createdAt: -1 };
      switch (filters.sort) {
        case 'oldest': sort = { createdAt: 1 }; break;
        case 'name_asc': sort = { name: 1 }; break;
        case 'name_desc': sort = { name: -1 }; break;
        case 'newest':
        default: sort = { createdAt: -1 }; break;
      }
      
      const [types, total, categories, subcategories] = await Promise.all([
        Type.find(filter)
          .populate('category', 'name')
          .populate('subCategory', 'name')
          .populate('admin', 'username email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Type.countDocuments(filter),
        Category.find({ admin: req.user._id }).sort({ name: 1 }),
        SubCategory.find({ admin: req.user._id }).sort({ name: 1 })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('typesCategories/list', {
        types: types || [],
        categories: categories || [],
        subcategories: subcategories || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalTypes: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      req.flash('error', 'Error fetching types: ' + error.message);
      
      res.render('typesCategories/list', {
        types: [],
        categories: [],
        subcategories: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalTypes: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  // Show form for new type
  newType: async (req, res) => {
    try {
      const categories = await Category.find({ admin: req.user._id }).sort({ name: 1 });
      res.render('typesCategories/new', {
        categories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading categories: ' + error.message);
      res.redirect('/admin/v1/parameters/types');
    }
  },

  // Get subcategories for a specific category (AJAX)
  getSubCategoriesForType: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const subcategories = await SubCategory.find({ category: categoryId }).sort({ name: 1 });
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching subcategories' });
    }
  },

  // Create a new type
  createType: async (req, res) => {
    try {
      const { name, category, subCategory } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const type = await Type.create({ 
        name, 
        slug,
        category,
        subCategory,
        admin: req.user._id
      });

      req.flash('success', 'Type created successfully');
      res.redirect('/admin/v1/parameters/types');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/parameters/types/new');
    }
  },

  // Show single type
  showType: async (req, res) => {
    try {
      const type = await Type.findOne({ _id: req.params.id, admin: req.user._id })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('admin', 'username email');
      
      if (!type) {
        req.flash('error', 'Type not found');
        return res.redirect('/admin/v1/parameters/types');
      }

      res.render('typesCategories/show', {
        type,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching type: ' + error.message);
      res.redirect('/admin/v1/parameters/types');
    }
  },

  // Show edit form
  editType: async (req, res) => {
    try {
      const type = await Type.findOne({ _id: req.params.id, admin: req.user._id })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('admin', 'username email');

      if (!type) {
        req.flash('error', 'Type not found');
        return res.redirect('/admin/v1/parameters/types');
      }

      const categories = await Category.find({ admin: req.user._id }).sort({ name: 1 });
      
      res.render('typesCategories/edit', {
        type,
        categories,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/parameters/types');
    }
  },

  // Update type
  updateType: async (req, res) => {
    try {
      const { name, category, subCategory } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await Type.findByIdAndUpdate(req.params.id, {
        name,
        slug,
        category,
        subCategory,
        admin: req.user._id
      });

      req.flash('success', 'Type updated successfully');
      res.redirect('/admin/v1/parameters/types');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect(`/admin/v1/parameters/types/${req.params.id}/edit`);
    }
  },

  // Delete type
  deleteType: async (req, res) => {
    try {
      const typeId = req.params.id;
      
      // Check if type exists
      const type = await Type.findById(typeId);
      if (!type) {
        req.flash('error', 'Type not found');
        return res.redirect('/admin/v1/parameters/types');
      }

      // In a complete system, you'd check for associated products here
      // Since Product model isn't implemented yet, we'll skip
      /*
      const productsCount = await Product.countDocuments({ type: typeId });
      if (productsCount > 0) {
        req.flash('error', `Cannot delete type with ${productsCount} associated products`);
        return res.redirect('/admin/v1/parameters/types');
      }
      */

      await Type.findByIdAndDelete(typeId);
      req.flash('success', 'Type deleted successfully');
      res.redirect('/admin/v1/parameters/types');
    } catch (error) {
      req.flash('error', 'Error deleting type: ' + error.message);
      res.redirect('/admin/v1/parameters/types');
    }
  },

  // Public API for types
  getAllPublicTypes: async (req, res) => {
    try {
      const types = await Type.find()
        .select('name slug category subCategory createdAt')
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: types.length,
        data: types
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // API to get types by subcategory (for frontend)
  getTypesBySubCategory: async (req, res) => {
    try {
      const { subCategoryId } = req.params;
      
      const types = await Type.find({ subCategory: subCategoryId })
        .select('name slug')
        .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: types.length,
        data: types
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // API to get products by type
  getProductsByType: async (req, res) => {
    try {
      const { typeId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      
      const { Product } = require('../models/productModel');
      
      const [products, total] = await Promise.all([
        Product.find({ type: typeId, status: 'active' })
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .populate('type', 'name slug')
          .populate('brand', 'name slug')
          .select('-admin')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments({ type: typeId, status: 'active' })
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
  },

  // API to get subcategories by category (for type form)
  getSubCategoriesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      const subcategories = await SubCategory.find({ 
        category: categoryId, 
        admin: req.user._id 
      }, 'name')
        .sort({ name: 1 });
      
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ error: 'Error fetching subcategories' });
    }
  }
};

module.exports = typeController;