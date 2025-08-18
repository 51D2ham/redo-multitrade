const { Brand } = require('../models/parametersModel');

const brandController = {
  // List all brands
  listBrands: async (req, res) => {
    try {
      const brands = await Brand.find({ admin: req.user._id })
        .populate('admin', 'username email')
        .sort({ name: 1 });
      
      res.render('brands/list', {
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error fetching brands: ' + error.message);
      res.redirect('/admin/v1/parameters/brands');
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
      const { name } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const brand = await Brand.create({ 
        name, 
        slug,
        admin: req.user._id
      });

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
      const brand = await Brand.findById(req.params.id)
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
      const brand = await Brand.findById(req.params.id)
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
      const { name } = req.body;
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await Brand.findByIdAndUpdate(req.params.id, {
        name,
        slug,
        admin: req.user._id,
        updatedAt: Date.now()
      });

      req.flash('success', 'Brand updated successfully');
      res.redirect('/admin/v1/parameters/brands');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
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
      const brands = await Brand.find()
        .select('name slug createdAt')
        .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: brands.length,
        data: brands
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