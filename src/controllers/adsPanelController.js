const fs = require('fs');
const path = require('path');
const AdsPanel = require('../models/AdsPanelModel');

function deleteImage(filename) {
  if (!filename) return;
  const filePath = path.join(__dirname, '../public/uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  async listAdsPanels(req, res) {
    const items = await AdsPanel.find({ admin: req.user._id });
    res.render('adsPanel/index', {
      baseUrl: req.baseUrl,
      items,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async newAdsPanelForm(req, res) {
    res.render('adsPanel/new', {
      baseUrl: req.baseUrl,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async createAdsPanel(req, res) {
    const { title, locationId, link, status } = req.body;
    const image = req.file ? req.file.filename : null;
    await AdsPanel.create({ title, locationId, link, status, image, admin: req.user._id });
    req.flash('success', 'Ads panel created successfully!');
    res.redirect(req.baseUrl);
  },

  async showAdsPanel(req, res) {
    const item = await AdsPanel.findOne({ _id: req.params.id, admin: req.user._id });
    if (!item) {
      req.flash('error', 'Ads panel not found');
      return res.redirect(req.baseUrl);
    }
    res.render('adsPanel/show', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async editAdsPanelForm(req, res) {
    const item = await AdsPanel.findOne({ _id: req.params.id, admin: req.user._id });
    if (!item) {
      req.flash('error', 'Ads panel not found');
      return res.redirect(req.baseUrl);
    }
    res.render('adsPanel/edit', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async updateAdsPanel(req, res) {
    const item = await AdsPanel.findOne({ _id: req.params.id, admin: req.user._id });
    if (!item) {
      req.flash('error', 'Ads panel not found');
      return res.redirect(req.baseUrl);
    }
    const { title, locationId, link, status } = req.body;
    const data = { title, locationId, link, status };
    if (req.file) {
      deleteImage(item.image);
      data.image = req.file.filename;
    }
    await AdsPanel.findByIdAndUpdate(item._id, data);
    req.flash('success', 'Ads panel updated successfully!');
    res.redirect(`${req.baseUrl}/${item._id}/edit`);
  },

  async deleteAdsPanel(req, res) {
    const item = await AdsPanel.findOne({ _id: req.params.id, admin: req.user._id });
    if (!item) {
      req.flash('error', 'Ads panel not found');
      return res.redirect(req.baseUrl);
    }
    deleteImage(item.image);
    await item.deleteOne();
    req.flash('success', 'Ads panel deleted successfully!');
    res.redirect(req.baseUrl);
  },

  // Public API
  async apiListAdsPanels(req, res) {
    const { locationId } = req.query;
    const filter = locationId ? { locationId, status: 'active' } : { status: 'active' };
    const items = await AdsPanel.find(filter);
    res.json(items);
  },

  async getAdsPanelById(req, res) {
    const item = await AdsPanel.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  }
};