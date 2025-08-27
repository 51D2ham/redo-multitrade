const fs = require('fs');
const path = require('path');
const CompanyInfo = require('../models/companyInfoModel');

function deleteImage(filename) {
  if (!filename) return;
  const filePath = path.join(__dirname, '../public/uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  async listCompanyInfo(req, res) {
    const items = await CompanyInfo.find().populate('admin', 'username email');
    res.render('companyInfo/index', {
      baseUrl: req.baseUrl,
      items,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async newCompanyInfoForm(req, res) {
    res.render('companyInfo/new', {
      baseUrl: req.baseUrl,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async createCompanyInfo(req, res) {
    const { title, description, email, phone, address, website, businessHours, status } = req.body;
    const { facebook, twitter, instagram, linkedin } = req.body;
    const logo = req.file ? req.file.filename : null;
    
    await CompanyInfo.create({ 
      title, description, email, phone, address, website, businessHours, status, logo,
      socialMedia: { facebook, twitter, instagram, linkedin },
      admin: req.user._id 
    });
    req.flash('success', 'Company information created successfully!');
    res.redirect(req.baseUrl);
  },

  async showCompanyInfo(req, res) {
    const item = await CompanyInfo.findById(req.params.id).populate('admin', 'username email');
    if (!item) {
      req.flash('error', 'Company information not found');
      return res.redirect(req.baseUrl);
    }
    res.render('companyInfo/show', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async editCompanyInfoForm(req, res) {
    const item = await CompanyInfo.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Company information not found');
      return res.redirect(req.baseUrl);
    }
    res.render('companyInfo/edit', {
      baseUrl: req.baseUrl,
      item,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async updateCompanyInfo(req, res) {
    const item = await CompanyInfo.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Company information not found');
      return res.redirect(req.baseUrl);
    }
    const { title, description, email, phone, address, website, businessHours, status } = req.body;
    const { facebook, twitter, instagram, linkedin } = req.body;
    const data = { 
      title, description, email, phone, address, website, businessHours, status,
      socialMedia: { facebook, twitter, instagram, linkedin }
    };
    if (req.file) {
      deleteImage(item.logo);
      data.logo = req.file.filename;
    }
    await CompanyInfo.findByIdAndUpdate(item._id, data);
    req.flash('success', 'Company information updated successfully!');
    res.redirect(`${req.baseUrl}/${item._id}/edit`);
  },

  async deleteCompanyInfo(req, res) {
    const item = await CompanyInfo.findById(req.params.id);
    if (!item) {
      req.flash('error', 'Company information not found');
      return res.redirect(req.baseUrl);
    }
    deleteImage(item.logo);
    await item.deleteOne();
    req.flash('success', 'Company information deleted successfully!');
    res.redirect(req.baseUrl);
  },

  // Public API
  async apiListCompanyInfo(req, res) {
    const items = await CompanyInfo.find({ status: 'active' });
    res.json(items);
  },

  async getCompanyInfoById(req, res) {
    const item = await CompanyInfo.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  }
};