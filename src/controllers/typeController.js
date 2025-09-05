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
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 })
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
      const categories = await Category.find().sort({ name: 1 });
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
      const { name, category, subCategory, isActive, isFeatured } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const typeData = {
        name, 
        slug,
        category,
        subCategory,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true,
        admin: req.user._id
      };


      
      const type = await Type.create(typeData);

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
      const type = await Type.findById(req.params.id)
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
      const type = await Type.findById(req.params.id)
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('admin', 'username email');

      if (!type) {
        req.flash('error', 'Type not found');
        return res.redirect('/admin/v1/parameters/types');
      }

      const categories = await Category.find().sort({ name: 1 });
      
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
      const { name, category, subCategory, isActive, isFeatured } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const updateData = {
        name,
        slug,
        category,
        subCategory,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true
      };



      await Type.findByIdAndUpdate(req.params.id, updateData);

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
      const types = await Type.find({ isActive: true })
        .select('name slug category subCategory')
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .sort({ name: 1 });
      
      const typesData = types.map(type => ({
        _id: type._id,
        name: type.name,
        slug: type.slug,
        category: type.category,
        subCategory: type.subCategory
      }));
      
      res.status(200).json({
        success: true,
        count: typesData.length,
        data: typesData
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
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const skip = (page - 1) * limit;
      
      // Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(typeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type ID'
        });
      }
      
      const { Product } = require('../models/productModel');
      
      const filter = { type: typeId, status: 'active' };
      
      // Add sorting
      let sort = { createdAt: -1 };
      switch (req.query.sort) {
        case 'price_asc': sort = { 'variants.price': 1 }; break;
        case 'price_desc': sort = { 'variants.price': -1 }; break;
        case 'rating': sort = { rating: -1 }; break;
        case 'newest': sort = { createdAt: -1 }; break;
      }
      
      const [products, total, type] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('_id title images variants rating reviewCount totalStock featured')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
        Type.findById(typeId).select('name').populate('category', 'name').populate('subCategory', 'name')
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
      
      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Type not found'
        });
      }
      
      const typeProducts = products.map(product => {
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
          type,
          products: typeProducts
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
      console.error('Get products by type error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // API to get subcategories by category (for type form)
  getSubCategoriesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      const subcategories = await SubCategory.find({ 
        category: categoryId
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