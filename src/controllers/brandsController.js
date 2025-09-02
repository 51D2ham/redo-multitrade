const { Brand } = require('../models/parametersModel');

const brandController = {
  // List all brands
  listBrands: async (req, res) => {
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
      
      const [brands, total] = await Promise.all([
        Brand.find(filter)
          .populate('admin', 'username email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Brand.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('brands/list', {
        brands: brands || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalBrands: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      req.flash('error', 'Error fetching brands: ' + error.message);
      
      res.render('brands/list', {
        brands: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalBrands: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  // Show form for new brand
  newBrand: (req, res) => {
    res.render('brands/new', {
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  // Create a new brand
  createBrand: async (req, res) => {
    try {
      const { name, isActive, isFeatured } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const adminId = req.user && req.user._id ? req.user._id : req.session?.admin?.id;
      if (!adminId) {
        req.flash('error', 'Authentication required');
        return res.redirect('/admin/v1/staff/login');
      }
      
      const brandData = {
        name, 
        slug,
        isActive: isActive === 'on' || isActive === true,
        isFeatured: isFeatured === 'on' || isFeatured === true,
        admin: adminId
      };

      if (req.file) {
        brandData.logo = req.file.filename;
      }
      
      const brand = await Brand.create(brandData);

      req.flash('success', 'Brand created successfully');
      res.redirect('/admin/v1/parameters/brands');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/parameters/brands/new');
    }
  },

  // Show single brand
  showBrand: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid brand ID');
        return res.redirect('/admin/v1/parameters/brands');
      }
      
      const brand = await Brand.findById(id)
        .populate('admin', 'username email');
      
      if (!brand) {
        req.flash('error', 'Brand not found');
        return res.redirect('/admin/v1/parameters/brands');
      }

      res.render('brands/show', {
        brand,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching brand: ' + error.message);
      res.redirect('/admin/v1/parameters/brands');
    }
  },

  // Show edit form
  editBrand: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid brand ID');
        return res.redirect('/admin/v1/parameters/brands');
      }
      
      const brand = await Brand.findById(id)
        .populate('admin', 'username email');

      if (!brand) {
        req.flash('error', 'Brand not found');
        return res.redirect('/admin/v1/parameters/brands');
      }

      res.render('brands/edit', {
        brand,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching brand: ' + error.message);
      res.redirect('/admin/v1/parameters/brands');
    }
  },

  // Update brand
  updateBrand: async (req, res) => {
    try {
      const brandId = req.params.id;
      const { name, isActive, isFeatured } = req.body;
      
      if (!name || !name.trim()) {
        req.flash('error', 'Brand name is required');
        return res.redirect(`/admin/v1/parameters/brands/${brandId}/edit`);
      }
      
      const updateData = {
        name: name.trim(),
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        isActive: !!isActive,
        isFeatured: !!isFeatured
      };

      if (req.file) {
        updateData.logo = req.file.filename;
      }

      await Brand.findByIdAndUpdate(brandId, updateData);

      req.flash('success', 'Brand updated successfully');
      res.redirect('/admin/v1/parameters/brands');
      
    } catch (error) {
      req.flash('error', 'Error updating brand');
      res.redirect(`/admin/v1/parameters/brands/${req.params.id}/edit`);
    }
  },

  // Delete brand
  deleteBrand: async (req, res) => {
    try {
      const brandId = req.params.id;
      
      // Check if brand exists
      const brand = await Brand.findById(brandId);
      if (!brand) {
        req.flash('error', 'Brand not found');
        return res.redirect('/admin/v1/parameters/brands');
      }

      // In a complete system, you'd check for associated products here
      // Since Product model isn't implemented yet, we'll skip
      /*
      const productsCount = await Product.countDocuments({ brand: brandId });
      if (productsCount > 0) {
        req.flash('error', `Cannot delete brand with ${productsCount} associated products`);
        return res.redirect('/admin/v1/parameters/brands');
      }
      */

      await Brand.findByIdAndDelete(brandId);
      req.flash('success', 'Brand deleted successfully');
      res.redirect('/admin/v1/parameters/brands');
    } catch (error) {
      req.flash('error', 'Error deleting brand: ' + error.message);
      res.redirect('/admin/v1/parameters/brands');
    }
  },

  // Public API for brands
  getAllPublicBrands: async (req, res) => {
    try {
      const brands = await Brand.find({ isActive: true })
        .select('name slug logo isActive isFeatured createdAt')
        .sort({ name: 1 });
      
      const brandsWithUrls = brands.map(brand => ({
        ...brand.toObject(),
        logoUrl: brand.logo ? `${req.protocol}://${req.get('host')}/uploads/${brand.logo}` : null
      }));
      
      res.status(200).json({
        success: true,
        count: brandsWithUrls.length,
        data: brandsWithUrls
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // API to get products by brand
  getProductsByBrand: async (req, res) => {
    try {
      const { brandId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      
      const { Product } = require('../models/productModel');
      
      const [products, total] = await Promise.all([
        Product.find({ brand: brandId, status: 'active' })
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .populate('type', 'name slug')
          .populate('brand', 'name slug')
          .select('-admin')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments({ brand: brandId, status: 'active' })
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

module.exports = brandController;