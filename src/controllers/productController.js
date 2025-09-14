const { Product, ProductSpecs, Review } = require('../models/productModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const SpecList = require('../models/specListModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/products');
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
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
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
  if (typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>"'&]/g, (match) => {
    const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
    return entities[match];
  }).trim();
};

// Common filter builder
const buildProductFilter = (query) => {
  const filter = { status: 'active' };
  
  // ID-based filters
  if (query.category && isValidObjectId(query.category)) filter.category = query.category;
  if (query.brand && isValidObjectId(query.brand)) filter.brand = query.brand;
  if (query.subcategory && isValidObjectId(query.subcategory)) filter.subCategory = query.subcategory;
  if (query.type && isValidObjectId(query.type)) filter.type = query.type;
  
  // Boolean filters
  if (query.featured === 'true') filter.featured = true;
  
  // Stock filter
  if (query.stock === 'instock') filter.totalStock = { $gt: 0 };
  if (query.stock === 'outofstock') filter.totalStock = 0;
  
  // Price range filter
  if (query.minPrice || query.maxPrice) {
    const priceFilter = {};
    if (query.minPrice) priceFilter.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) priceFilter.$lte = parseFloat(query.maxPrice);
    filter['variants.price'] = priceFilter;
  }
  
  // Date filters
  if (query.newArrivals === 'true') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.createdAt = { $gte: thirtyDaysAgo };
  }
  
  if (query.fromDate || query.toDate) {
    const dateFilter = {};
    if (query.fromDate) dateFilter.$gte = new Date(query.fromDate);
    if (query.toDate) {
      const toDate = new Date(query.toDate);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }
    filter.createdAt = dateFilter;
  }
  
  // Search filter
  if (query.search) {
    const searchTerm = sanitizeInput(query.search);
    filter.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ];
  }
  
  return filter;
};

// Common sort builder
const buildSort = (sortParam) => {
  const sortOptions = {
    price_asc: { 'variants.price': 1 },
    price_desc: { 'variants.price': -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { title: 1 },
    name_desc: { title: -1 },
    featured: { featured: -1, createdAt: -1 }
  };
  return sortOptions[sortParam] || { createdAt: -1 };
};

// Transform product to lightweight format
const transformToLightweight = (product, allSpecs = []) => {
  const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
  const price = defaultVariant?.price || 0;
  const originalPrice = defaultVariant?.originalPrice || null;
  const isOnSale = !!(originalPrice && originalPrice > price);
  const discountPercent = isOnSale ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const thumbnail = product.images?.[0] ? `/uploads/products/${product.images[0]}` : null;
  
  // Get specs for this product (prioritized by importance)
  const specPriority = ['Noise Cancellation', 'Driver Size', 'Frequency Response', 'Battery Life', 'Connectivity', 'RAM', 'Storage', 'Display', 'Processor'];
  
  const productSpecs = allSpecs
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
    specs: productSpecs
  };
};

// Process variants helper
const processVariants = (variantsData) => {
  const variants = [];
  if (variantsData) {
    for (let i = 0; variantsData[i]; i++) {
      const variant = variantsData[i];
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
  return variants;
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
        const searchTerm = req.query.search.trim();
        filter.$or = [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { 'variants.sku': { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ];
      }
      
      if (req.query.stock) {
        const stockFilters = {
          instock: { $gt: 5 },
          lowstock: { $gte: 1, $lte: 5 },
          outofstock: 0
        };
        filter.totalStock = stockFilters[req.query.stock];
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

      let slug = generateSlug(title);
      const existingProduct = await Product.findOne({ slug });
      if (existingProduct) {
        slug = `${slug}-${Date.now()}`;
      }

      const images = req.files ? req.files.map(file => file.filename) : [];
      const variants = processVariants(req.body.variants);

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

      if (req.body.warranty) productData.warranty = req.body.warranty.trim();
      if (req.body.tags) {
        productData.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      const product = await Product.create(productData);

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
        SpecList.find({ status: 'active' }).populate('category', 'name').populate('subCategory', 'name').populate('type', 'name').populate('brand', 'name').sort({ title: 1 }),
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

      let images = [...product.images];
      
      if (req.body.removedImages) {
        try {
          const removedImages = JSON.parse(req.body.removedImages);
          removedImages.forEach(filename => {
            const filePath = path.join(__dirname, '../../public/uploads/products', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
          images = images.filter(img => !removedImages.includes(img));
        } catch (e) {
          console.error('Error parsing removedImages:', e);
        }
      }
      
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.filename);
        images = [...images, ...newImages];
      }

      let slug = product.slug;
      if (title !== product.title) {
        slug = generateSlug(title);
        const existingProduct = await Product.findOne({ slug, _id: { $ne: product._id } });
        if (existingProduct) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      const variants = processVariants(req.body.variants);

      // Log inventory changes
      const InventoryService = require('../services/inventoryService');
      const adminId = req.user._id;
      
      for (const newVariant of variants) {
        const oldVariant = product.variants.find(v => v.sku === newVariant.sku);
        if (oldVariant && oldVariant.stock !== newVariant.stock) {
          try {
            await InventoryService.logMovement(
              product._id,
              newVariant.sku,
              'adjustment',
              Math.abs(newVariant.stock - oldVariant.stock),
              oldVariant.stock,
              newVariant.stock,
              adminId,
              null,
              `Stock updated via product edit: ${oldVariant.stock} → ${newVariant.stock}`
            );
          } catch (logError) {
            console.error('Inventory log error:', logError);
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

      if (req.body.warranty) updateData.warranty = req.body.warranty.trim();
      if (req.body.returnPolicy) updateData.returnPolicy = req.body.returnPolicy.trim();
      if (req.body.shippingInfo) updateData.shippingInfo = req.body.shippingInfo.trim();
      if (req.body.tags) {
        updateData.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      await Product.findByIdAndUpdate(req.params.id, updateData);

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

      if (product.images && product.images.length > 0) {
        product.images.forEach(filename => {
          const filePath = path.join(__dirname, '../../public/uploads/products', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }

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

  // Public API - Get featured products
  getFeaturedProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 12, 50);
      const skip = (page - 1) * limit;
      
      const filter = { status: 'active', featured: true };
      
      // Initialize featuredRank for products that don't have it
      await Product.updateMany(
        { featured: true, $or: [{ featuredRank: { $exists: false } }, { featuredRank: 0 }] },
        { featuredRank: 999 }
      );
      
      const sort = { featuredRank: 1, createdAt: -1 };
      
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('_id title images variants rating reviewCount totalStock featured featuredRank')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter)
      ]);
      
      const productIds = products.map(p => p._id);
      const productSpecs = await ProductSpecs.find({ 
        product: { $in: productIds } 
      })
      .populate('specList', 'title')
      .select('product specList value');
      
      const lightweightProducts = products.map(product => transformToLightweight(product, productSpecs));
      
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
      console.error('Get featured products error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Public API - Get all products
  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const skip = (page - 1) * limit;
      
      const filter = buildProductFilter(req.query);
      const sort = buildSort(req.query.sort);
      
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name')
          .populate('brand', 'name')
          .select('_id title images variants rating reviewCount totalStock featured')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter)
      ]);
      
      // Get specs for all products
      const productIds = products.map(p => p._id);
      const productSpecs = await ProductSpecs.find({ 
        product: { $in: productIds } 
      })
      .populate('specList', 'title')
      .select('product specList value');
      
      // Sort by spec title
      let lightweightProducts = products.map(product => transformToLightweight(product, productSpecs));
      
      // Post-filter for discount
      if (req.query.discount) {
        if (req.query.discount === 'true') {
          lightweightProducts = lightweightProducts.filter(product => product.isOnSale);
        } else {
          const discountPercent = parseInt(req.query.discount);
          if (!isNaN(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
            lightweightProducts = lightweightProducts.filter(product => 
              product.isOnSale && product.discountPercent >= discountPercent
            );
          }
        }
      }
      
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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Public API - Get product by ID
  getProductById: async (req, res) => {
    try {
      const identifier = req.params.id;
      
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Product ID or slug is required'
        });
      }
      
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
      
      Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).catch(err => 
        console.error('View count update failed:', err)
      );
      
      const [specifications, reviews] = await Promise.all([
        ProductSpecs.find({ product: product._id })
          .populate('specList', 'title unit')
          .select('specList value'),
        Review.find({ product: product._id, status: 'approved' })
          .populate('user', 'fullname')
          .select('rating comment createdAt user')
          .sort({ createdAt: -1 })
          .limit(20)
      ]);
      
      const productObj = product.toObject();
      const productData = {
        _id: productObj._id,
        slug: productObj.slug,
        title: productObj.title,
        description: productObj.description,
        shortDescription: productObj.shortDescription,
        images: product.images?.map(img => `/uploads/products/${img}`) || [],
        category: productObj.category,
        subCategory: productObj.subCategory,
        type: productObj.type,
        brand: productObj.brand,
        variants: productObj.variants,
        rating: productObj.rating || 0,
        reviewCount: productObj.reviewCount || 0,
        totalStock: productObj.totalStock || 0,
        status: productObj.status,
        featured: productObj.featured || false,
        warranty: productObj.warranty,
        returnPolicy: productObj.returnPolicy,
        shippingInfo: productObj.shippingInfo,
        tags: productObj.tags || [],
        createdAt: productObj.createdAt,
        updatedAt: productObj.updatedAt,
        specifications,
        reviews
      };
      
      res.status(200).json({
        success: true,
        data: productData
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Public API - Get product filters
  getProductFilters: async (req, res) => {
    try {
      const [categories, brands, subcategories, types] = await Promise.all([
        Category.find().select('name slug').sort({ name: 1 }),
        Brand.find().select('name slug').sort({ name: 1 }),
        SubCategory.find().select('name slug category').populate('category', 'name').sort({ name: 1 }),
        Type.find().select('name slug category subCategory').populate('category', 'name').populate('subCategory', 'name').sort({ name: 1 })
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          categories,
          brands,
          subcategories,
          types
        }
      });
    } catch (error) {
      console.error('Get product filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
      
      const validIds = ids.filter(id => isValidObjectId(id));
      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid specification IDs provided'
        });
      }
      
      const specifications = await SpecList.find({ _id: { $in: validIds } })
        .select('_id title unit')
        .sort({ title: 1 });
      
      res.status(200).json({
        success: true,
        data: specifications
      });
    } catch (error) {
      console.error('Get specifications by IDs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Admin - Featured products ranking
  featuredProductsRanking: async (req, res) => {
    try {
      const products = await Product.find({ featured: true })
        .populate('category', 'name')
        .populate('brand', 'name')
        .select('_id title images featuredRank totalStock status')
        .sort({ featuredRank: 1, createdAt: -1 });

      res.render('products/featured-ranking', {
        title: 'Featured Products Ranking',
        products,
        csrfToken: req.session.csrfToken,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Featured products ranking error:', error);
      req.flash('error', 'Error loading featured products');
      res.redirect('/admin/v1/products');
    }
  },

  // Admin - Update featured products ranking
  updateFeaturedRanking: async (req, res) => {
    try {
      const { rankings } = req.body;
      
      if (!rankings) {
        req.flash('error', 'No ranking data received');
        return res.redirect('/admin/v1/products/featured/ranking');
      }

      let parsedRankings;
      try {
        parsedRankings = typeof rankings === 'string' ? JSON.parse(rankings) : rankings;
      } catch (e) {
        req.flash('error', 'Invalid ranking data format');
        return res.redirect('/admin/v1/products/featured/ranking');
      }

      if (!Array.isArray(parsedRankings)) {
        req.flash('error', 'Rankings must be an array');
        return res.redirect('/admin/v1/products/featured/ranking');
      }

      const updatePromises = parsedRankings.map((item, index) => {
        if (isValidObjectId(item.id)) {
          return Product.findByIdAndUpdate(item.id, { 
            featuredRank: index + 1 
          });
        }
      }).filter(Boolean);

      await Promise.all(updatePromises);

      req.flash('success', 'Featured products ranking updated successfully');
      res.redirect('/admin/v1/products/featured/ranking');
    } catch (error) {
      console.error('Update featured ranking error:', error);
      req.flash('error', 'Error updating ranking: ' + error.message);
      res.redirect('/admin/v1/products/featured/ranking');
    }
  },

  // Upload middleware
  uploadImages: upload.array('images', 10)
};