const fs = require('fs');
const path = require('path');
const HeroCarousel = require('../models/heroCarouselModel');

function deleteImage(filename) {
  if (!filename) return;
  const filePath = path.join(__dirname, '../public/uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

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
    const { title, subtitle, link, status } = req.body;
    const image = req.file ? req.file.filename : null;
    await HeroCarousel.create({ title, subtitle, link, image, status: status || 'active', type: 'custom', admin: req.user._id });
    req.flash('success', 'Carousel item added!');
    res.redirect(req.baseUrl);
  },

  async showCarouselItem(req, res) {
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
    const item = await HeroCarousel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    const { title, subtitle, link, status } = req.body;
    const data = { title, subtitle, link, status: status || 'active' };
    if (req.file) {
      deleteImage(item.image);
      data.image = req.file.filename;
    }
    await HeroCarousel.findByIdAndUpdate(item._id, data);
    req.flash('success', 'Carousel item updated!');
    res.redirect(`${req.baseUrl}/${item._id}/edit`);
  },

  async deleteCarouselItem(req, res) {
    const item = await HeroCarousel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect(req.baseUrl);
    }
    deleteImage(item.image);
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