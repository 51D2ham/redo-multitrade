const SpecList = require('../models/specListModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const { Product, ProductSpecs } = require('../models/productModel');

module.exports = {
  // PUBLIC API CONTROLLERS
  getAllPublicSpecLists: async (req, res) => {
    try {
      const specLists = await SpecList.find({ status: 'active' })
        .populate('category', 'name')
        .select('-admin')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: specLists.length,
        data: specLists
      });
    } catch (error) {
      console.error('Get public spec lists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get specifications that can be used for filtering
  getFilterableSpecs: async (req, res) => {
    try {
      const { category, subCategory, type, brand } = req.query;
      
      let specQuery = { status: 'active', displayInFilter: true };
      
      if (category) specQuery.category = category;
      if (subCategory) specQuery.subCategory = subCategory;
      if (type) specQuery.type = type;
      if (brand) specQuery.brand = brand;

      const specLists = await SpecList.find(specQuery)
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name')
        .select('-admin')
        .sort({ title: 1 });

      // Get values for each spec with product counts
      const specsWithValues = await Promise.all(
        specLists.map(async (spec) => {
          const values = await ProductSpecs.aggregate([
            { $match: { specList: spec._id } },
            {
              $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
              }
            },
            { $match: { 'productInfo.status': 'active' } },
            {
              $group: {
                _id: '$value',
                productCount: { $sum: 1 }
              }
            },
            { $sort: { productCount: -1 } },
            { $limit: 20 }
          ]);

          return {
            ...spec.toObject(),
            values: values.map(v => ({
              value: v._id,
              productCount: v.productCount
            }))
          };
        })
      );

      res.status(200).json({
        success: true,
        count: specsWithValues.length,
        data: specsWithValues.filter(spec => spec.values.length > 0)
      });
    } catch (error) {
      console.error('Get filterable specs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get products by specification value
  getProductsBySpec: async (req, res) => {
    try {
      const { spec, specId, value, page = 1, limit = 20 } = req.query;
      
      if (!value) {
        return res.status(400).json({
          success: false,
          message: 'Specification value is required'
        });
      }

      let specQuery = {};
      
      // Find spec by ID or title
      if (specId) {
        specQuery._id = specId;
      } else if (spec) {
        specQuery.title = { $regex: spec, $options: 'i' };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either spec name or specId is required'
        });
      }

      // Find the specification
      const specList = await SpecList.findOne({ ...specQuery, status: 'active' });
      if (!specList) {
        return res.status(404).json({
          success: false,
          message: 'Specification not found'
        });
      }

      // Find ProductSpecs matching the spec and value
      const productSpecs = await ProductSpecs.find({
        specList: specList._id,
        value: { $regex: value, $options: 'i' }
      }).populate({
        path: 'product',
        match: { status: 'active' },
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      });

      // Filter out specs with null products (inactive products)
      const validProductSpecs = productSpecs.filter(ps => ps.product);
      const productIds = [...new Set(validProductSpecs.map(ps => ps.product._id.toString()))];
      
      // Get products with inventory and pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const products = await Product.find({ 
        _id: { $in: productIds },
        status: 'active'
      })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      // Get products with inventory from variants
      const productsWithInventory = products.map(product => {
        const specs = validProductSpecs.filter(ps => ps.product._id.toString() === product._id.toString());
        const defaultVariant = product.defaultVariant;
        
        return {
          ...product.toObject(),
          inventory: defaultVariant ? {
            price: defaultVariant.price,
            oldPrice: defaultVariant.oldPrice,
            discountPrice: defaultVariant.discountPrice,
            qty: defaultVariant.qty,
            status: defaultVariant.status
          } : null,
          matchingSpecs: specs.map(s => ({
            title: specList.title,
            value: s.value
          }))
        };
      });

      const totalProducts = productIds.length;
      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      res.status(200).json({
        success: true,
        spec: {
          _id: specList._id,
          title: specList.title,
          searchValue: value
        },
        products: productsWithInventory,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get products by spec error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Filter products by multiple specifications
  filterProductsBySpecs: async (req, res) => {
    try {
      const { specs, page = 1, limit = 20, category, subCategory, type, brand, minPrice, maxPrice } = req.query;
      
      if (!specs) {
        return res.status(400).json({
          success: false,
          message: 'Specifications filter is required. Format: specs[specId]=value1,value2'
        });
      }

      let productQuery = { status: 'active' };
      if (category) productQuery.category = category;
      if (subCategory) productQuery.subCategory = subCategory;
      if (type) productQuery.type = type;
      if (brand) productQuery.brand = brand;
      if (minPrice || maxPrice) {
        productQuery.price = {};
        if (minPrice) productQuery.price.$gte = parseFloat(minPrice);
        if (maxPrice) productQuery.price.$lte = parseFloat(maxPrice);
      }

      // Parse specs filter: specs[specId1]=value1,value2&specs[specId2]=value3
      const specFilters = [];
      for (const [key, values] of Object.entries(specs)) {
        const valueArray = Array.isArray(values) ? values : values.split(',');
        specFilters.push({
          specList: key,
          value: { $in: valueArray }
        });
      }

      // Find products that match ALL specification filters
      const matchingProductIds = [];
      for (const filter of specFilters) {
        const productSpecs = await ProductSpecs.find(filter).distinct('product');
        if (matchingProductIds.length === 0) {
          matchingProductIds.push(...productSpecs);
        } else {
          // Intersection: keep only products that match this filter too
          const intersection = matchingProductIds.filter(id => 
            productSpecs.some(specId => specId.toString() === id.toString())
          );
          matchingProductIds.length = 0;
          matchingProductIds.push(...intersection);
        }
      }

      if (matchingProductIds.length > 0) {
        productQuery._id = { $in: matchingProductIds };
      } else {
        // No products match all filters
        return res.status(200).json({
          success: true,
          products: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalProducts: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const totalProducts = await Product.countDocuments(productQuery);
      
      const products = await Product.find(productQuery)
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      // Add inventory and matching specs to products
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const matchingSpecs = await ProductSpecs.find({
            product: product._id,
            specList: { $in: Object.keys(specs) }
          }).populate('specList', 'title');

          const defaultVariant = product.defaultVariant;
          
          return {
            ...product.toObject(),
            inventory: defaultVariant ? {
              price: defaultVariant.price,
              oldPrice: defaultVariant.oldPrice,
              discountPrice: defaultVariant.discountPrice,
              qty: defaultVariant.qty,
              status: defaultVariant.status
            } : null,
            matchingSpecs: matchingSpecs.map(ms => ({
              title: ms.specList.title,
              value: ms.value
            }))
          };
        })
      );

      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      res.status(200).json({
        success: true,
        appliedFilters: specs,
        products: productsWithDetails,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Filter products by specs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Search products by specification query
  searchProductsBySpec: async (req, res) => {
    try {
      const { q, spec, page = 1, limit = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      let specQuery = { status: 'active' };
      if (spec) {
        specQuery.title = { $regex: spec, $options: 'i' };
      }

      // Find matching specifications
      const specLists = await SpecList.find(specQuery);
      const specIds = specLists.map(s => s._id);

      // Find ProductSpecs with matching values
      const productSpecs = await ProductSpecs.find({
        specList: { $in: specIds },
        value: { $regex: q, $options: 'i' }
      }).populate({
        path: 'product',
        match: { status: 'active' },
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      }).populate('specList', 'title');

      // Filter out specs with null products (inactive products)
      const validProductSpecs = productSpecs.filter(ps => ps.product);
      const productIds = [...new Set(validProductSpecs.map(ps => ps.product._id.toString()))];
      
      // Get products with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const products = await Product.find({ 
        _id: { $in: productIds },
        status: 'active'
      })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      // Get products with inventory and matching specs
      const productsWithDetails = products.map(product => {
        const matchingSpecs = validProductSpecs
          .filter(ps => ps.product._id.toString() === product._id.toString())
          .map(ps => ({
            title: ps.specList.title,
            value: ps.value
          }));
        
        const defaultVariant = product.defaultVariant;
        
        return {
          ...product.toObject(),
          inventory: defaultVariant ? {
            price: defaultVariant.price,
            oldPrice: defaultVariant.oldPrice,
            discountPrice: defaultVariant.discountPrice,
            qty: defaultVariant.qty,
            status: defaultVariant.status
          } : null,
          matchingSpecs
        };
      });

      const totalProducts = productIds.length;
      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      res.status(200).json({
        success: true,
        searchQuery: q,
        specFilter: spec || 'all',
        products: productsWithDetails,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Search products by spec error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get available values for a specification
  getSpecValues: async (req, res) => {
    try {
      const { spec, specId } = req.query;
      
      let specQuery = { status: 'active' };
      
      if (specId) {
        specQuery._id = specId;
      } else if (spec) {
        specQuery.title = { $regex: spec, $options: 'i' };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either spec name or specId is required'
        });
      }

      // Find the specification
      const specList = await SpecList.findOne(specQuery);
      if (!specList) {
        return res.status(404).json({
          success: false,
          message: 'Specification not found'
        });
      }

      // Get all unique values for this specification with active products only
      const productSpecs = await ProductSpecs.aggregate([
        { $match: { specList: specList._id } },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $match: { 'productInfo.status': 'active' } },
        {
          $group: {
            _id: '$value',
            productCount: { $sum: 1 }
          }
        },
        { $sort: { productCount: -1 } }
      ]);

      const valuesWithCount = productSpecs.map(item => ({
        value: item._id,
        productCount: item.productCount
      }));

      res.status(200).json({
        success: true,
        spec: {
          _id: specList._id,
          title: specList.title
        },
        values: valuesWithCount.sort((a, b) => b.productCount - a.productCount)
      });
    } catch (error) {
      console.error('Get spec values error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // ADMIN DASHBOARD CONTROLLERS
  listSpecLists: async (req, res) => {
    try {
      const filters = req.query || {};
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
      
      if (filters.status) filter.status = filters.status;
      if (filters.category) filter.category = filters.category;
      if (filters.displayInFilter) {
        filter.displayInFilter = filters.displayInFilter === 'true';
      }
      
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        filter.$or = [
          { title: searchRegex },
          { value: searchRegex }
        ];
      }
      
      let sort = { createdAt: -1 };
      switch (filters.sort) {
        case 'oldest': sort = { createdAt: 1 }; break;
        case 'title_asc': sort = { title: 1 }; break;
        case 'title_desc': sort = { title: -1 }; break;
        case 'newest':
        default: sort = { createdAt: -1 }; break;
      }
      
      const [specLists, total, categories] = await Promise.all([
        SpecList.find(filter)
          .populate('admin', 'username email fullname')
          .populate('category', 'name')
          .populate('subCategory', 'name')
          .populate('type', 'name')
          .populate('brand', 'name')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        SpecList.countDocuments(filter),
        Category.find().sort({ name: 1 })
      ]);
      
      const totalPages = Math.ceil(total / limit);

      res.render('specLists/list', {
        title: 'Manage Spec Lists',
        specLists: specLists || [],
        categories: categories || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalSpecLists: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      console.error('SpecList list error:', error);
      req.flash('error', 'Error loading spec lists');
      
      res.render('specLists/list', {
        title: 'Manage Spec Lists',
        specLists: [],
        categories: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalSpecLists: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  newSpecList: async (req, res) => {
    try {
      const [categories, subCategories, types, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);
      
      res.render('specLists/new', {
        title: 'Create New Spec List',
        categories,
        subCategories,
        types,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Load new spec list form error:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  createSpecList: async (req, res) => {
    try {
      const { title, value, status, category, subCategory, type, brand, displayInFilter } = req.body;
      
      if (!title || title.trim().length === 0) {
        req.flash('error', 'Spec title is required');
        return res.redirect('/admin/v1/parameters/spec-lists/new');
      }
      
      const adminId = req.user && req.user._id ? req.user._id : req.session?.admin?.id;
      if (!adminId) {
        req.flash('error', 'Authentication required');
        return res.redirect('/admin/v1/staff/login');
      }
      
      await SpecList.create({
        title: title.trim(),
        value: value ? value.trim() : '',
        status: status || 'active',
        category: category || null,
        subCategory: subCategory || null,
        type: type || null,
        brand: brand || null,
        displayInFilter: displayInFilter === 'on' || displayInFilter === 'true',
        admin: adminId
      });
      
      req.flash('success', 'Spec list created successfully');
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Create spec list error:', error);
      req.flash('error', 'Error creating spec list: ' + error.message);
      res.redirect('/admin/v1/parameters/spec-lists/new');
    }
  },

  showSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const specList = await SpecList.findById(specListId)
        .populate('admin', 'username email fullname')
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('type', 'name')
        .populate('brand', 'name');

      if (!specList) {
        req.flash('error', 'Spec list not found');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      res.render('specLists/show', {
        title: 'Spec List Details',
        specList,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Show spec list error:', error);
      req.flash('error', 'Error loading spec list');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  editSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      
      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const specList = await SpecList.findById(specListId);

      if (!specList) {
        req.flash('error', 'Spec list not found');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const [categories, subCategories, types, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        SubCategory.find().sort({ name: 1 }),
        Type.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);

      res.render('specLists/edit', {
        title: 'Edit Spec List',
        specList,
        categories,
        subCategories,
        types,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Edit spec list error:', error);
      req.flash('error', 'Error loading spec list');
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  },

  updateSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      const { title, value, status, category, subCategory, type, brand, displayInFilter } = req.body;

      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      if (!title || title.trim().length === 0) {
        req.flash('error', 'Spec title is required');
        return res.redirect(`/admin/v1/parameters/spec-lists/${specListId}/edit`);
      }

      const adminId = req.user && req.user._id ? req.user._id : req.session?.admin?.id;
      if (!adminId) {
        req.flash('error', 'Authentication required');
        return res.redirect('/admin/v1/staff/login');
      }

      const updatedSpecList = await SpecList.findOneAndUpdate(
        { _id: specListId, admin: adminId },
        {
          title: title.trim(),
          value: value ? value.trim() : '',
          status: status || 'active',
          category: category || null,
          subCategory: subCategory || null,
          type: type || null,
          brand: brand || null,
          displayInFilter: displayInFilter === 'on' || displayInFilter === 'true'
        },
        { new: true, runValidators: true }
      );

      if (!updatedSpecList) {
        req.flash('error', 'Spec list not found or you do not have permission to update it');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      req.flash('success', 'Spec list updated successfully');
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Update spec list error:', error);
      req.flash('error', 'Error updating spec list: ' + error.message);
      res.redirect(`/admin/v1/parameters/spec-lists/${req.params.id}/edit`);
    }
  },

  deleteSpecList: async (req, res) => {
    try {
      const specListId = req.params.id;
      const adminId = req.user._id;

      // Validate ObjectId
      if (!specListId.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid spec list ID');
        return res.redirect('/admin/v1/parameters/spec-lists');
      }

      const deletedSpec = await SpecList.findOneAndDelete({ 
        _id: specListId, 
        admin: adminId 
      });
      
      if (!deletedSpec) {
        req.flash('error', 'Spec list not found or you do not have permission to delete it');
      } else {
        req.flash('success', 'Spec list deleted successfully');
      }
      
      res.redirect('/admin/v1/parameters/spec-lists');
    } catch (error) {
      console.error('Delete spec list error:', error);
      req.flash('error', 'Error deleting spec list: ' + error.message);
      res.redirect('/admin/v1/parameters/spec-lists');
    }
  }
};