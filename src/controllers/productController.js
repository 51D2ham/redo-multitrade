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
    const allowedTypes = /jpeg|jpg|png|webp/;
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
  // Admin - List products
  listProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
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
      res.render('products/list', {
        title: 'Manage Products',
        products: [],
        categories: [],
        brands: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1 },
        filters: {},
        success: req.flash('success'),
        error: req.flash('error')
      });
    }
  },

  // Admin - Show new product form
  newProduct: async (req, res) => {
    try {
      const [categories, subCategories, types, brands, specLists] = await Promise.all([
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 }),
        SpecList.find().sort({ title: 1 })
      ]);
      
      res.render('products/new', {
        title: 'Create New Product',
        categories,
        subCategories,
        types,
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

  // Admin - Create product
  createProduct: async (req, res) => {
    try {
      const { title, description, shortDescription, category, subCategory, type, brand, status, featured } = req.body;

      if (!title || !description || !category || !subCategory || !type || !brand) {
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
          if (variant.sku && variant.price && variant.stock !== undefined) {
            variants.push({
              sku: variant.sku,
              price: parseFloat(variant.price),
              originalPrice: variant.originalPrice ? parseFloat(variant.originalPrice) : undefined,
              stock: parseInt(variant.stock),
              lowStockAlert: parseInt(variant.lowStockAlert) || 5,
              color: variant.color || '',
              size: variant.size || '',
              material: variant.material || '',
              weight: variant.weight ? parseFloat(variant.weight) : undefined,
              dimensions: variant.dimensions || '',
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
        category,
        subCategory,
        type,
        brand,
        variants,
        status: status || 'draft',
        featured: featured === 'true',
        admin: req.user._id
      };

      // Add business fields
      if (req.body.warranty) productData.warranty = req.body.warranty.trim();
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

  // Admin - Show product
  showProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findById(req.params.id)
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

  // Admin - Edit product
  editProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const [product, categories, subCategories, types, brands, specLists, specifications] = await Promise.all([
        Product.findById(req.params.id),
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 }),
        SpecList.find().sort({ title: 1 }),
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

  // Admin - Update product
  updateProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/v1/products');
      }

      const { title, description, shortDescription, category, subCategory, type, brand, status, featured } = req.body;

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
          if (variant.sku && variant.price && variant.stock !== undefined) {
            variants.push({
              _id: variant._id || undefined,
              sku: variant.sku,
              price: parseFloat(variant.price),
              originalPrice: variant.originalPrice ? parseFloat(variant.originalPrice) : undefined,
              stock: parseInt(variant.stock),
              lowStockAlert: parseInt(variant.lowStockAlert) || 5,
              color: variant.color || '',
              size: variant.size || '',
              material: variant.material || '',
              weight: variant.weight ? parseFloat(variant.weight) : undefined,
              dimensions: variant.dimensions || '',
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
        category,
        subCategory,
        type,
        brand,
        variants,
        status: status || 'draft',
        featured: featured === 'true'
      };

      // Add business fields
      if (req.body.warranty) updateData.warranty = req.body.warranty.trim();
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

  // Admin - Delete product
  deleteProduct: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        req.flash('error', 'Invalid product ID');
        return res.redirect('/admin/v1/products');
      }

      const product = await Product.findByIdAndDelete(req.params.id);

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

  // Public API - Get all products (OPTIMIZED & LIGHTWEIGHT)
  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const skip = (page - 1) * limit;
      
      const filter = { status: 'active' };
      
      if (req.query.category) filter.category = req.query.category;
      if (req.query.subCategory) filter.subCategory = req.query.subCategory;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.brand) filter.brand = req.query.brand;
      if (req.query.featured === 'true') filter.featured = true;
      
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }
      
      let sort = { createdAt: -1 };
      switch (req.query.sort) {
        case 'price_asc': sort = { 'variants.price': 1 }; break;
        case 'price_desc': sort = { 'variants.price': -1 }; break;
        case 'rating': sort = { rating: -1 }; break;
        case 'popular': sort = { reviewCount: -1 }; break;
        case 'newest': sort = { createdAt: -1 }; break;
      }
      
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('_id title images rating reviewCount totalStock featured createdAt variants')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter)
      ]);
      
      // Get specification IDs for all products
      const productIds = products.map(p => p._id);
      const specifications = await ProductSpecs.find({ product: { $in: productIds } })
        .select('product specList');
      
      // Group specification IDs by product
      const specsMap = {};
      specifications.forEach(spec => {
        const productId = spec.product.toString();
        if (!specsMap[productId]) specsMap[productId] = [];
        specsMap[productId].push(spec.specList);
      });
      
      // Transform to lightweight format with specification IDs
      const lightweightProducts = products.map(product => ({
        _id: product._id,
        title: product.title,
        thumbnail: product.thumbnail, // Virtual field
        price: product.price, // Virtual field
        originalPrice: product.originalPrice, // Virtual field
        isOnSale: product.isOnSale, // Virtual field
        discountPercent: product.discountPercent, // Virtual field
        rating: product.rating,
        reviewCount: product.reviewCount,
        totalStock: product.totalStock, // Total variant stock count
        featured: product.featured,
        category: product.category,
        brand: product.brand,
        specifications: specsMap[product._id.toString()] || []
      }));
      
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        success: true,
        data: lightweightProducts,
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

  // Public API - Get product by ID/slug (FULL DETAILS)
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
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name');
      
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
          .select('_id title images rating reviewCount')
          .limit(8)
      ]);
      
      // Transform related products to lightweight format
      const lightweightRelated = relatedProducts.map(p => ({
        _id: p._id,
        title: p.title,
        thumbnail: p.thumbnail,
        price: p.price,
        originalPrice: p.originalPrice,
        isOnSale: p.isOnSale,
        rating: p.rating,
        reviewCount: p.reviewCount,
        category: p.category,
        brand: p.brand
      }));
      
      res.status(200).json({
        success: true,
        data: {
          ...product.toObject(),
          specifications,
          reviews,
          relatedProducts: lightweightRelated
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
      const [categories, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          categories,
          brands
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

  // Public API - Get specifications by IDs
  getSpecificationsByIds: async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Specification IDs array is required'
        });
      }
      
      const specifications = await SpecList.find({ _id: { $in: ids } })
        .select('_id title unit');
      
      res.status(200).json({
        success: true,
        data: specifications
      });
    } catch (error) {
      console.error('Get specifications by IDs error:', error);
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