const BrandCarousel = require('../models/brandCarouselModel');
const { Brand } = require('../models/parametersModel');

module.exports = {
  async listBrandCarousel(req, res) {
    const items = await BrandCarousel.find()
      .populate('brand', 'name logo')
      .populate('admin', 'username email')
      .sort({ order: 1, createdAt: -1 });
    res.render('brandCarousel/index', {
      baseUrl: req.baseUrl,
      items,
      csrfToken: res.locals.csrfToken,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async newBrandCarouselForm(req, res) {
    try {
      const [brands, usedBrands, maxOrder] = await Promise.all([
        Brand.find({ isActive: true }).sort({ name: 1 }),
        BrandCarousel.find().select('brand'),
        BrandCarousel.findOne().sort({ order: -1 }).select('order')
      ]);
      
      // Filter out brands already in carousel
      const usedBrandIds = usedBrands.map(item => item.brand.toString());
      const availableBrands = brands.filter(brand => !usedBrandIds.includes(brand._id.toString()));
      
      const nextOrder = (maxOrder?.order || 0) + 1;
      
      res.render('brandCarousel/new', {
        baseUrl: req.baseUrl,
        brands: availableBrands,
        nextOrder,
        csrfToken: res.locals.csrfToken,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading brands: ' + error.message);
      res.redirect(req.baseUrl);
    }
  },

  async createBrandCarousel(req, res) {
    try {
      const { brand, order, status } = req.body;
      
      if (!brand) {
        req.flash('error', 'Please select a brand');
        return res.redirect(`${req.baseUrl}/new`);
      }
      
      // Check if brand already exists
      const existingBrand = await BrandCarousel.findOne({ brand });
      if (existingBrand) {
        req.flash('error', 'Brand already exists in carousel');
        return res.redirect(`${req.baseUrl}/new`);
      }
      
      let finalOrder = parseInt(order);
      
      // If no order provided or invalid, get next available order
      if (!finalOrder || finalOrder < 1) {
        const maxOrder = await BrandCarousel.findOne().sort({ order: -1 }).select('order');
        finalOrder = (maxOrder?.order || 0) + 1;
      } else {
        // Check if order already exists
        const existingOrder = await BrandCarousel.findOne({ order: finalOrder });
        if (existingOrder) {
          req.flash('error', `Order ${finalOrder} is already taken. Please choose a different order.`);
          return res.redirect(`${req.baseUrl}/new`);
        }
      }

      await BrandCarousel.create({ 
        brand, 
        order: finalOrder, 
        status: status || 'active', 
        admin: req.user._id 
      });
      
      req.flash('success', `Brand added to carousel at position ${finalOrder}!`);
      res.redirect(req.baseUrl);
    } catch (error) {
      console.error('Create brand carousel error:', error);
      req.flash('error', 'Error adding brand to carousel: ' + error.message);
      res.redirect(`${req.baseUrl}/new`);
    }
  },

  async showBrandCarousel(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    const item = await BrandCarousel.findById(req.params.id)
      .populate('brand', 'name logo')
      .populate('admin', 'username email');
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    res.render('brandCarousel/show', {
      baseUrl: req.baseUrl,
      item,
      csrfToken: res.locals.csrfToken,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async editBrandCarouselForm(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    try {
      const [item, brands, usedBrands, usedOrders] = await Promise.all([
        BrandCarousel.findById(req.params.id).populate('brand'),
        Brand.find({ isActive: true }).sort({ name: 1 }),
        BrandCarousel.find({ _id: { $ne: req.params.id } }).select('brand'),
        BrandCarousel.find({ _id: { $ne: req.params.id } }).select('order').sort({ order: 1 })
      ]);
      
      if (!item) {
        req.flash('error', 'Item not found');
        return res.redirect(req.baseUrl);
      }
      
      // Filter available brands (exclude current item's brand from filtering)
      const usedBrandIds = usedBrands.map(b => b.brand.toString());
      const availableBrands = brands.filter(brand => 
        !usedBrandIds.includes(brand._id.toString()) || brand._id.toString() === item.brand._id.toString()
      );
      
      const usedOrderNumbers = usedOrders.map(o => o.order);
      
      res.render('brandCarousel/edit', {
        baseUrl: req.baseUrl,
        item,
        brands: availableBrands,
        usedOrders: usedOrderNumbers,
        csrfToken: res.locals.csrfToken,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading form: ' + error.message);
      res.redirect(req.baseUrl);
    }
  },

  async updateBrandCarousel(req, res) {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid item ID');
        return res.redirect(req.baseUrl);
      }
      
      const item = await BrandCarousel.findById(req.params.id);
      if (!item) {
        req.flash('error', 'Item not found');
        return res.redirect(req.baseUrl);
      }
      
      const { brand, order, status } = req.body;
      
      if (!brand) {
        req.flash('error', 'Please select a brand');
        return res.redirect(`${req.baseUrl}/${item._id}/edit`);
      }
      
      // Check if brand already exists (excluding current item)
      if (brand !== item.brand.toString()) {
        const existingBrand = await BrandCarousel.findOne({ brand, _id: { $ne: item._id } });
        if (existingBrand) {
          req.flash('error', 'Brand already exists in carousel');
          return res.redirect(`${req.baseUrl}/${item._id}/edit`);
        }
      }
      
      const newOrder = parseInt(order);
      if (!newOrder || newOrder < 1) {
        req.flash('error', 'Order must be a positive number');
        return res.redirect(`${req.baseUrl}/${item._id}/edit`);
      }
      
      // Check if order already exists (excluding current item)
      if (newOrder !== item.order) {
        const existingOrder = await BrandCarousel.findOne({ order: newOrder, _id: { $ne: item._id } });
        if (existingOrder) {
          req.flash('error', `Order ${newOrder} is already taken. Please choose a different order.`);
          return res.redirect(`${req.baseUrl}/${item._id}/edit`);
        }
      }

      await BrandCarousel.findByIdAndUpdate(item._id, {
        brand,
        order: newOrder,
        status: status || 'active'
      });
      
      req.flash('success', `Brand carousel updated! Position: ${newOrder}`);
      res.redirect(`${req.baseUrl}/${item._id}/edit`);
    } catch (error) {
      console.error('Update brand carousel error:', error);
      req.flash('error', 'Error updating brand carousel: ' + error.message);
      res.redirect(`${req.baseUrl}/${req.params.id}/edit`);
    }
  },

  async deleteBrandCarousel(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    const item = await BrandCarousel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    await item.deleteOne();
    req.flash('success', 'Brand removed from carousel!');
    res.redirect(req.baseUrl);
  },

  // Public API
  async apiListBrandCarousel(req, res) {
    const items = await BrandCarousel.find({ status: 'active' })
      .populate('brand', 'name logo')
      .sort({ order: 1, createdAt: -1 });
    
    const itemsWithFullUrls = items.map(item => ({
      _id: item._id,
      brand: {
        _id: item.brand._id,
        name: item.brand.name,
        logo: item.brand.logo ? `/uploads/${item.brand.logo}` : null
      },
      order: item.order,
      status: item.status
    }));
    
    res.json(itemsWithFullUrls);
  },

  async getBrandCarouselById(req, res) {
    const item = await BrandCarousel.findById(req.params.id)
      .populate('brand', 'name logo');
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    const itemWithFullUrl = {
      _id: item._id,
      brand: {
        _id: item.brand._id,
        name: item.brand.name,
        logo: item.brand.logo ? `/uploads/${item.brand.logo}` : null
      },
      order: item.order,
      status: item.status
    };
    
    res.json(itemWithFullUrl);
  }
};