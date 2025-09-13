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
      const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
      res.render('brandCarousel/new', {
        baseUrl: req.baseUrl,
        brands,
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
    const { brand, order, status } = req.body;
    
    // Check if brand already exists in carousel
    const existing = await BrandCarousel.findOne({ brand });
    if (existing) {
      req.flash('error', 'Brand already exists in carousel');
      return res.redirect(`${req.baseUrl}/new`);
    }

    await BrandCarousel.create({ 
      brand, 
      order: parseInt(order) || 0, 
      status: status || 'active', 
      admin: req.user._id 
    });
    req.flash('success', 'Brand added to carousel!');
    res.redirect(req.baseUrl);
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
      const [item, brands] = await Promise.all([
        BrandCarousel.findById(req.params.id).populate('brand'),
        Brand.find({ isActive: true }).sort({ name: 1 })
      ]);
      if (!item) {
        req.flash('error', 'Item not found');
        return res.redirect(req.baseUrl);
      }
      res.render('brandCarousel/edit', {
        baseUrl: req.baseUrl,
        item,
        brands,
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
    
    // Check if brand already exists (excluding current item)
    if (brand !== item.brand.toString()) {
      const existing = await BrandCarousel.findOne({ brand, _id: { $ne: item._id } });
      if (existing) {
        req.flash('error', 'Brand already exists in carousel');
        return res.redirect(`${req.baseUrl}/${item._id}/edit`);
      }
    }

    await BrandCarousel.findByIdAndUpdate(item._id, {
      brand,
      order: parseInt(order) || 0,
      status: status || 'active'
    });
    req.flash('success', 'Brand carousel updated!');
    res.redirect(`${req.baseUrl}/${item._id}/edit`);
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