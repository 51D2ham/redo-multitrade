const HeroCarousel = require('../models/heroCarouselModel');
const { secureDeleteFile } = require('../utils/secureFileHandler');

module.exports = {
  async listCarouselItems(req, res) {
    const items = await HeroCarousel.find().populate('admin', 'username email');
    res.render('heroCarousel/index', {
      baseUrl: req.baseUrl,
      items,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  },

  async newCarouselItemForm(req, res) {
    res.render('heroCarousel/new', {
      baseUrl: req.baseUrl,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  },

  async createCarouselItem(req, res) {
    try {
      const { title, subtitle, link, status } = req.body;
      
      if (!req.file) {
        req.flash('error', 'Hero image is required');
        return res.redirect(`${req.baseUrl}/create`);
      }
      
      const image = req.file.filename;
      await HeroCarousel.create({ title, subtitle, link, image, status: status || 'active', type: 'custom', admin: req.user._id });
      req.flash('success', 'Carousel item added!');
      res.redirect(req.baseUrl);
    } catch (error) {
      console.error('Create carousel item error:', error);
      
      // Handle specific Multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File too large. Maximum size is 5MB.');
      } else if (error.code === 'INVALID_FILE_TYPE') {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Error creating carousel item: ' + error.message);
      }
      
      res.redirect(`${req.baseUrl}/create`);
    }
  },

  async showCarouselItem(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    const item = await HeroCarousel.findById(req.params.id).populate('admin', 'username email');
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    res.render('heroCarousel/show', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  },

  async editCarouselItemForm(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    const item = await HeroCarousel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    res.render('heroCarousel/edit', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  },

  async updateCarouselItem(req, res) {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid item ID');
        return res.redirect(req.baseUrl);
      }
      const item = await HeroCarousel.findById(req.params.id);
      if (!item) {
        req.flash('error', 'Item not found');
        return res.redirect(req.baseUrl);
      }
      const { title, subtitle, link, status } = req.body;
      const data = { title, subtitle, link, status: status || 'active' };
      if (req.file) {
        secureDeleteFile(item.image);
        data.image = req.file.filename;
      }
      await HeroCarousel.findByIdAndUpdate(item._id, data);
      req.flash('success', 'Carousel item updated!');
      res.redirect(`${req.baseUrl}/${item._id}/edit`);
    } catch (error) {
      console.error('Update carousel item error:', error);
      
      // Handle specific Multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File too large. Maximum size is 5MB.');
      } else if (error.code === 'INVALID_FILE_TYPE') {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Error updating carousel item: ' + error.message);
      }
      
      res.redirect(`${req.baseUrl}/${req.params.id}/edit`);
    }
  },

  async deleteCarouselItem(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid item ID');
      return res.redirect(req.baseUrl);
    }
    const item = await HeroCarousel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    secureDeleteFile(item.image);
    await item.deleteOne();
    req.flash('success', 'Carousel item deleted!');
    res.redirect(req.baseUrl);
  },

  // Public API
  async apiListCarouselItems(req, res) {
    const items = await HeroCarousel.find({ status: 'active' });
    const itemsWithFullUrls = items.map(item => ({
      ...item.toObject(),
      image: item.image ? `/uploads/${item.image}` : null
    }));
    res.json(itemsWithFullUrls);
  },

  async getCarouselItemById(req, res) {
    const item = await HeroCarousel.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const itemWithFullUrl = {
      ...item.toObject(),
      image: item.image ? `/uploads/${item.image}` : null
    };
    res.json(itemWithFullUrl);
  }
};