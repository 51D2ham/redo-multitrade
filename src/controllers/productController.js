const { Product, ProductSpecs, Review } = require('../models/productModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const SpecList = require('../models/specListModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper functions
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

module.exports = {
  // List products
  listProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      const adminId = req.admin?._id || req.user?._id;
      console.log('Admin ID for product listing:', adminId);
      const filter = {}; // Temporarily remove admin filter
      console.log('Total products in DB:', await Product.countDocuments({}));
      
      if (req.query.status) filter.status = req.query.status;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.brand) filter.brand = req.query.brand;
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }
      
      const [products, total, categories, brands] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('subCategory', 'name')
          .populate('type', 'name')
          .populate('brand', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('products/list', {
        title: 'Manage Products',
        products,
        categories,
        brands,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1
        },
        filters: req.query,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('List products error:', error);
      req.flash('error', 'Error loading products');
      res.redirect('/admin/v1/staff/dashboard');
    }
  },

  // Show new product form
  newProduct: async (req, res) => {
    try {
      const [categories, brands, specLists] = await Promise.all([
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 }),
        SpecList.find({ admin: req.user._id }).sort({ title: 1 })
      ]);
      
      res.render('products/new', {
        title: 'Create New Product',
        categories,
        brands,
        specLists,
        formData: {},
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('New product form error:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/admin/v1/products');
    }
  },

  // Create product
  createProduct: async (req, res) => {
    try {
      const { title, description, shortDescription, basePrice, category, subCategory, type, brand, status, featured } = req.body;

      if (!title || !description || !basePrice || !category || !subCategory || !type || !brand) {
        req.flash('error', 'All required fields must be filled');
        return res.redirect('/admin/v1/products/new');
      }

      // Generate slug
      let slug = generateSlug(title);
      const existingProduct = await Product.findOne({ slug });
      if (existingProduct) {
        slug = `${slug}-${Date.now()}`;
      }

      // Handle images
      const images = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          images.push(`/uploads/products/${file.filename}`);
        });
      }

      // Process variants
      const variants = [];
      if (req.body.variants) {
        for (let i = 0; req.body.variants[i]; i++) {
          const variant = req.body.variants[i];
          if (variant.sku && variant.price && variant.qty !== undefined) {
            variants.push({
              sku: variant.sku,
              price: parseFloat(variant.price),
              oldPrice: variant.oldPrice ? parseFloat(variant.oldPrice) : undefined,
              discountPrice: variant.discountPrice ? parseFloat(variant.discountPrice) : undefined,
              qty: parseInt(variant.qty),
              thresholdQty: parseInt(variant.thresholdQty) || 5,
              color: variant.color || '',
              size: variant.size || '',
              material: variant.material || '',
              weight: variant.weight ? parseFloat(variant.weight) : undefined,
              shipping: variant.shipping !== 'false',
              isDefault: variant.isDefault === 'true' || i === 0
            });
          }
        }
      }

      // Create product
      const productData = {
        slug,
        title: title.trim(),
        description: description.trim(),
        shortDescription: shortDescription?.trim(),
        images,
        price: parseFloat(basePrice),
        category,
        subCategory,
        type,
        brand,
        variants,
        status: status || 'draft',
        featured: featured === 'true',
        isDiscounted: req.body.isDiscounted === 'true',
        admin: req.user._id
      };

      // Add business fields
      if (req.body.warranty) productData.warranty = req.body.warranty.trim();
      if (req.body.returnPolicy) productData.returnPolicy = req.body.returnPolicy.trim();
      if (req.body.shippingInfo) productData.shippingInfo = req.body.shippingInfo.trim();
      
      // Handle tags array
      if (req.body.tags) {
        productData.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      const product = await Product.create(productData);

      // Add specifications
      if (req.body.specifications) {
        const specs = [];
        for (let i = 0; req.body.specifications[i]; i++) {
          const spec = req.body.specifications[i];
          if (spec.specList && spec.value) {
            specs.push({
              product: product._id,
              specList: spec.specList,
              value: spec.value.trim()
            });
          }
        }
        
        if (specs.length > 0) {
          await ProductSpecs.insertMany(specs);
        }
      }

      req.flash('success', 'Product created successfully');
      res.redirect('/admin/v1/products');
    } catch (error) {
      console.error('Create product error:', error);
      req.flash('error', 'Error creating product: ' + error.message);
      res.redirect('/admin/v1/products/new');
    }
  },

  // Show product
  showProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findOne({
        _id: req.params.id,
        admin: req.user._id
      })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name');

      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }

      const [specifications, reviews] = await Promise.all([
        ProductSpecs.find({ product: product._id }).populate('specList', 'title'),
        Review.find({ product: product._id }).populate('user', 'fullname').sort({ createdAt: -1 }).limit(10)
      ]);

      res.render('products/show', {
        title: 'Product Details',
        product,
        specifications,
        reviews,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Show product error:', error);
      req.flash('error', 'Error loading product');
      res.redirect('/admin/v1/products');
    }
  },

  // Edit product
  editProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const [product, categories, subCategories, types, brands, specLists, specifications] = await Promise.all([
        Product.findOne({ _id: req.params.id, admin: req.user._id }),
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 }),
        SpecList.find({ admin: req.user._id }).sort({ title: 1 }),
        ProductSpecs.find({ product: req.params.id }).populate('specList', 'title')
      ]);

      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }

      res.render('products/edit', {
        title: 'Edit Product',
        product,
        categories,
        subCategories,
        types,
        brands,
        specLists,
        specifications,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Edit product form error:', error);
      req.flash('error', 'Error loading product');
      res.redirect('/admin/v1/products');
    }
  },

  // Update product
  updateProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findOne({ _id: req.params.id, admin: req.user._id });
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }

      const { title, description, shortDescription, basePrice, category, subCategory, type, brand, status, featured } = req.body;

      // Handle images
      let images = [...product.images];
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
        images = [...images, ...newImages];
      }

      // Update slug if title changed
      let slug = product.slug;
      if (title !== product.title) {
        slug = generateSlug(title);
        const existingProduct = await Product.findOne({ slug, _id: { $ne: product._id } });
        if (existingProduct) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      // Process variants
      const variants = [];
      if (req.body.variants) {
        for (let i = 0; req.body.variants[i]; i++) {
          const variant = req.body.variants[i];
          if (variant.sku && variant.price && variant.qty !== undefined) {
            variants.push({
              _id: variant._id || undefined,
              sku: variant.sku,
              price: parseFloat(variant.price),
              oldPrice: variant.oldPrice ? parseFloat(variant.oldPrice) : undefined,
              discountPrice: variant.discountPrice ? parseFloat(variant.discountPrice) : undefined,
              qty: parseInt(variant.qty),
              thresholdQty: parseInt(variant.thresholdQty) || 5,
              color: variant.color || '',
              size: variant.size || '',
              material: variant.material || '',
              weight: variant.weight ? parseFloat(variant.weight) : undefined,
              shipping: variant.shipping !== 'false',
              isDefault: variant.isDefault === 'true' || i === 0
            });
          }
        }
      }

      const updateData = {
        slug,
        title: title.trim(),
        description: description.trim(),
        shortDescription: shortDescription?.trim(),
        images,
        price: parseFloat(basePrice),
        category,
        subCategory,
        type,
        brand,
        variants,
        status: status || 'draft',
        featured: featured === 'true',
        isDiscounted: req.body.isDiscounted === 'true'
      };

      // Add business fields
      if (req.body.warranty) updateData.warranty = req.body.warranty.trim();
      if (req.body.returnPolicy) updateData.returnPolicy = req.body.returnPolicy.trim();
      if (req.body.shippingInfo) updateData.shippingInfo = req.body.shippingInfo.trim();
      
      // Handle tags array
      if (req.body.tags) {
        updateData.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      await Product.findByIdAndUpdate(req.params.id, updateData);

      // Update specifications
      await ProductSpecs.deleteMany({ product: req.params.id });
      if (req.body.specifications) {
        const specs = [];
        for (let i = 0; req.body.specifications[i]; i++) {
          const spec = req.body.specifications[i];
          if (spec.specList && spec.value) {
            specs.push({
              product: req.params.id,
              specList: spec.specList,
              value: spec.value.trim()
            });
          }
        }
        
        if (specs.length > 0) {
          await ProductSpecs.insertMany(specs);
        }
      }

      req.flash('success', 'Product updated successfully');
      res.redirect('/admin/v1/products');
    } catch (error) {
      console.error('Update product error:', error);
      req.flash('error', 'Error updating product: ' + error.message);
      res.redirect(`/admin/v1/products/${req.params.id}/edit`);
    }
  },

  // Delete product
  deleteProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findOneAndDelete({
        _id: req.params.id,
        admin: req.user._id
      });

      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }

      // Delete related data
      await Promise.all([
        ProductSpecs.deleteMany({ product: req.params.id }),
        Review.deleteMany({ product: req.params.id })
      ]);

      req.flash('success', 'Product deleted successfully');
      res.redirect('/admin/v1/products');
    } catch (error) {
      console.error('Delete product error:', error);
      req.flash('error', 'Error deleting product: ' + error.message);
      res.redirect('/admin/v1/products');
    }
  },

  // Public API - Get all products
  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
      
      const filter = { status: 'active' };
      
      if (req.query.category) filter.category = req.query.category;
      if (req.query.subCategory) filter.subCategory = req.query.subCategory;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.brand) filter.brand = req.query.brand;
      
      if (req.query.minPrice || req.query.maxPrice) {
        filter.minPrice = {};
        if (req.query.minPrice) filter.minPrice.$gte = parseFloat(req.query.minPrice);
        if (req.query.maxPrice) filter.minPrice.$lte = parseFloat(req.query.maxPrice);
      }
      
      if (req.query.minRating) {
        filter.rating = { $gte: parseFloat(req.query.minRating) };
      }
      
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }
      
      if (req.query.featured === 'true') {
        filter.featured = true;
      }
      
      let sort = { createdAt: -1 };
      switch (req.query.sort) {
        case 'price_asc': sort = { minPrice: 1 }; break;
        case 'price_desc': sort = { minPrice: -1 }; break;
        case 'rating': sort = { rating: -1 }; break;
        case 'popular': sort = { reviewCount: -1 }; break;
        case 'newest': sort = { createdAt: -1 }; break;
      }
      
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .populate('type', 'name slug')
          .populate('brand', 'name slug')
          .select('-admin')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter)
      ]);
      
      // Add specifications to each product
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
      console.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Public API - Get product by ID
  getProductById: async (req, res) => {
    try {
      const identifier = req.params.id;
      let filter;
      
      if (isValidObjectId(identifier)) {
        filter = { _id: identifier, status: 'active' };
      } else {
        filter = { slug: identifier, status: 'active' };
      }
      
      const product = await Product.findOne(filter)
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .populate('type', 'name slug')
        .populate('brand', 'name slug')
        .select('-admin');
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Increment view count
      await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });
      
      const [specifications, reviews, relatedProducts] = await Promise.all([
        ProductSpecs.find({ product: product._id }).populate('specList', 'title'),
        Review.find({ product: product._id, status: 'approved' })
          .populate('user', 'fullname')
          .sort({ createdAt: -1 })
          .limit(20),
        Product.find({
          _id: { $ne: product._id },
          $or: [{ category: product.category }, { brand: product.brand }],
          status: 'active'
        })
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('title slug thumbnail minPrice maxPrice rating reviewCount')
          .limit(8)
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          ...product.toObject(),
          specifications,
          reviews,
          relatedProducts
        }
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Public API - Get product filters
  getProductFilters: async (req, res) => {
    try {
      const [categories, brands, priceRange] = await Promise.all([
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 }),
        Product.aggregate([
          { $match: { status: 'active' } },
          { 
            $group: { 
              _id: null, 
              minPrice: { $min: '$minPrice' }, 
              maxPrice: { $max: '$maxPrice' } 
            } 
          }
        ])
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          categories,
          brands,
          priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
        }
      });
    } catch (error) {
      console.error('Get product filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Upload middleware
  uploadImages: upload.array('images', 10)
};