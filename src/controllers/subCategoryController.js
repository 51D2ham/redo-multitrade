const { Category, SubCategory, Type } = require('../models/parametersModel');

const subCategoryController = {
  // List all subcategories with their categories
  listSubCategories: async (req, res) => {
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
      
      if (filters.category) {
        filter.category = filters.category;
      }
      
      let sort = { createdAt: -1 };
      switch (filters.sort) {
        case 'oldest': sort = { createdAt: 1 }; break;
        case 'name_asc': sort = { name: 1 }; break;
        case 'name_desc': sort = { name: -1 }; break;
        case 'newest':
        default: sort = { createdAt: -1 }; break;
      }
      
      const [subcategories, total, categories] = await Promise.all([
        SubCategory.find(filter)
          .populate('category', 'name')
          .populate('admin', 'username email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        SubCategory.countDocuments(filter),
        Category.find().sort({ name: 1 })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('subCategories/list', {
        subcategories: subcategories || [],
        categories: categories || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalSubCategories: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      req.flash('error', 'Error fetching subcategories: ' + error.message);
      
      res.render('subCategories/list', {
        subcategories: [],
        categories: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalSubCategories: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  // Show form for new subcategory
  newSubCategory: async (req, res) => {
    try {
      const categories = await Category.find().sort({ name: 1 });
      res.render('subCategories/new', {
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
      const { name, category, isActive, isFeatured } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const subcategoryData = {
        name, 
        slug,
        category,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true,
        admin: req.user._id || req.session.admin.id
      };



      const subcategory = await SubCategory.create(subcategoryData);
      
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

      res.render('subCategories/show', {
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

      const categories = await Category.find().sort({ name: 1 });
      
      res.render('subCategories/edit', {
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
      const { name, category, isActive, isFeatured } = req.body;

      if (!name) {
        req.flash('error', 'Subcategory name is required');
        return res.redirect(`/admin/v1/parameters/subcategories/${req.params.id}/edit`);
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const updateData = {
        name,
        slug,
        category,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true
      };
      
      const updated = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
      
      if (!updated) {
        req.flash('error', 'Subcategory not found');
        return res.redirect('/admin/v1/parameters/subcategories');
      }
      
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
      
      // Check if subcategory exists
      const subcategory = await SubCategory.findById(subcategoryId);
      if (!subcategory) {
        req.flash('error', 'Subcategory not found');
        return res.redirect('/admin/v1/parameters/subcategories');
      }

      // Check for associated types
      const typesCount = await Type.countDocuments({ subCategory: subcategoryId });
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
      const subcategories = await SubCategory.find({ isActive: true })
        .select('name slug category')
        .populate('category', 'name slug')
        .sort({ name: 1 });
      
      const subcategoriesData = subcategories.map(subcategory => ({
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        category: subcategory.category
      }));
      
      res.status(200).json({
        success: true,
        count: subcategoriesData.length,
        data: subcategoriesData
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
      
      const subcategories = await SubCategory.find({ category: categoryId, isActive: true })
        .select('name slug isActive isFeatured')
        .sort({ name: 1 });
      
      const subcategoriesWithUrls = subcategories.map(subcategory => subcategory.toObject());
      
      res.status(200).json({
        success: true,
        count: subcategoriesWithUrls.length,
        data: subcategoriesWithUrls
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
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const skip = (page - 1) * limit;
      
      // Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(subCategoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategory ID'
        });
      }
      
      const { Product } = require('../models/productModel');
      
      const filter = { subCategory: subCategoryId, status: 'active' };
      
      // Add sorting
      let sort = { createdAt: -1 };
      switch (req.query.sort) {
        case 'price_asc': sort = { 'variants.price': 1 }; break;
        case 'price_desc': sort = { 'variants.price': -1 }; break;
        case 'rating': sort = { rating: -1 }; break;
        case 'newest': sort = { createdAt: -1 }; break;
      }
      
      const [products, total, subCategory] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('_id title images variants rating reviewCount totalStock featured')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
        SubCategory.findById(subCategoryId).select('name').populate('category', 'name')
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
      
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Subcategory not found'
        });
      }
      
      const subCategoryProducts = products.map(product => {
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
          category: product.category,
          brand: product.brand,
          specs: specs
        };
      });
      
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        success: true,
        data: {
          subCategory,
          products: subCategoryProducts
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
      console.error('Get products by subcategory error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = subCategoryController;