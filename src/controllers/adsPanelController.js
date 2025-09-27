const AdsPanel = require('../models/AdsPanelModel');
const { secureDeleteFile } = require('../utils/secureFileHandler');

module.exports = {
  async listAdsPanels(req, res) {
    const items = await AdsPanel.find().populate('admin', 'username email');
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
    try {
      const { title, locationId, link, status } = req.body;
      
      if (!req.file) {
        req.flash('error', 'Ad image is required');
        return res.redirect(`${req.baseUrl}/create`);
      }
      
      const image = req.file.filename;
      await AdsPanel.create({ title, locationId, link, status, image, admin: req.user._id });
      req.flash('success', 'Ads panel created successfully!');
      res.redirect(req.baseUrl);
    } catch (error) {
      console.error('Create ads panel error:', error);
      
      // Handle specific Multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File too large. Maximum size is 5MB.');
      } else if (error.code === 'INVALID_FILE_TYPE') {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Error creating ads panel: ' + error.message);
      }
      
      res.redirect(`${req.baseUrl}/create`);
    }
  },

  async showAdsPanel(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid ads panel ID');
      return res.redirect(req.baseUrl);
    }
    const item = await AdsPanel.findById(req.params.id).populate('admin', 'username email');
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
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid ads panel ID');
      return res.redirect(req.baseUrl);
    }
    const item = await AdsPanel.findById(req.params.id);
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
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        req.flash('error', 'Invalid ads panel ID');
        return res.redirect(req.baseUrl);
      }
      const item = await AdsPanel.findById(req.params.id);
      if (!item) {
        req.flash('error', 'Ads panel not found');
        return res.redirect(req.baseUrl);
      }
      const { title, locationId, link, status } = req.body;
      const data = { title, locationId, link, status };
      if (req.file) {
        secureDeleteFile(item.image);
        data.image = req.file.filename;
      }
      await AdsPanel.findByIdAndUpdate(item._id, data);
      req.flash('success', 'Ads panel updated successfully!');
      res.redirect(`${req.baseUrl}/${item._id}/edit`);
    } catch (error) {
      console.error('Update ads panel error:', error);
      
      // Handle specific Multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File too large. Maximum size is 5MB.');
      } else if (error.code === 'INVALID_FILE_TYPE') {
        req.flash('error', error.message);
      } else {
        req.flash('error', 'Error updating ads panel: ' + error.message);
      }
      
      res.redirect(`${req.baseUrl}/${req.params.id}/edit`);
    }
  },

  async deleteAdsPanel(req, res) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error', 'Invalid ads panel ID');
      return res.redirect(req.baseUrl);
    }
    const item = await AdsPanel.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Ads panel not found');
      return res.redirect(req.baseUrl);
    }
    secureDeleteFile(item.image);
    await item.deleteOne();
    req.flash('success', 'Ads panel deleted successfully!');
    res.redirect(req.baseUrl);
  },

  // Public API
  async apiListAdsPanels(req, res) {
    const { locationId } = req.query;
    const filter = locationId ? { locationId, status: 'active' } : { status: 'active' };
    const items = await AdsPanel.find(filter);
    const itemsWithFullUrls = items.map(item => ({
      ...item.toObject(),
      image: item.image ? `/uploads/${item.image}` : null
    }));
    res.json(itemsWithFullUrls);
  },

  async getAdsPanelById(req, res) {
    const item = await AdsPanel.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const itemWithFullUrl = {
      ...item.toObject(),
      image: item.image ? `/uploads/${item.image}` : null
    };
    res.json(itemWithFullUrl);
  }
};