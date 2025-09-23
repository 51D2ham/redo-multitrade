const ParameterPoster = require('../models/parameterPosterModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const upload = require('../middlewares/productPhoto');

const parameterPosterController = {
  // List all parameter posters
  listParameterPosters: async (req, res) => {
    try {
      const filters = req.query || {};
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
      
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        filter.title = searchRegex;
      }
      
      if (filters.parameterType) {
        filter.parameterType = filters.parameterType;
      }
      
      if (filters.status) {
        filter.status = filters.status;
      }
      
      let sort = { order: 1, createdAt: -1 };
      
      const [posters, total] = await Promise.all([
        ParameterPoster.find(filter)
          .populate('admin', 'username email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        ParameterPoster.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('parameterPosters/list', {
        title: 'Parameter Posters',
        posters: posters || [],
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          next: page + 1,
          prev: page - 1,
          totalPosters: total
        },
        filters: filters || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    } catch (error) {
      req.flash('error', 'Error loading parameter posters: ' + error.message);
      res.render('parameterPosters/list', {
        title: 'Parameter Posters',
        posters: [],
        pagination: { current: 1, total: 1, hasNext: false, hasPrev: false, next: 1, prev: 1, totalPosters: 0 },
        filters: req.query || {},
        success: req.flash('success') || [],
        error: req.flash('error') || []
      });
    }
  },

  // Show form for new parameter poster
  newParameterPoster: async (req, res) => {
    try {
      const [categories, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);

      res.render('parameterPosters/new', {
        title: 'Create Parameter Poster',
        categories,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading form: ' + error.message);
      res.redirect('/admin/v1/content/parameter-posters');
    }
  },

  // Create new parameter poster
  createParameterPoster: async (req, res) => {
    try {
      const { title, parameterType, parameterId, status } = req.body;
      
      if (!req.file) {
        req.flash('error', 'Image is required');
        return res.redirect('/admin/v1/content/parameter-posters/new');
      }

      const adminId = req.user && req.user._id ? req.user._id : req.session?.admin?.id;
      if (!adminId) {
        req.flash('error', 'Authentication required');
        return res.redirect('/admin/v1/staff/login');
      }
      
      const posterData = {
        title,
        image: `/uploads/${req.file.filename}`,
        parameterType,
        parameterId,
        status: status || 'active',
        admin: adminId
      };
      
      await ParameterPoster.create(posterData);
      
      req.flash('success', 'Parameter poster created successfully');
      res.redirect('/admin/v1/content/parameter-posters');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect('/admin/v1/content/parameter-posters/new');
    }
  },

  // Show parameter poster details
  showParameterPoster: async (req, res) => {
    try {
      const poster = await ParameterPoster.findById(req.params.id)
        .populate('admin', 'username email');

      if (!poster) {
        req.flash('error', 'Parameter poster not found');
        return res.redirect('/admin/v1/content/parameter-posters');
      }

      // Get parameter details based on type
      let parameterDetails = null;
      switch (poster.parameterType) {
        case 'category':
          parameterDetails = await Category.findById(poster.parameterId);
          break;
        case 'brand':
          parameterDetails = await Brand.findById(poster.parameterId);
          break;
      }

      res.render('parameterPosters/show', {
        title: 'Parameter Poster Details',
        poster,
        parameterDetails,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading parameter poster: ' + error.message);
      res.redirect('/admin/v1/content/parameter-posters');
    }
  },

  // Show edit form
  editParameterPoster: async (req, res) => {
    try {
      const poster = await ParameterPoster.findById(req.params.id);

      if (!poster) {
        req.flash('error', 'Parameter poster not found');
        return res.redirect('/admin/v1/content/parameter-posters');
      }

      const [categories, brands] = await Promise.all([
        Category.find().sort({ name: 1 }),
        Brand.find().sort({ name: 1 })
      ]);

      res.render('parameterPosters/edit', {
        title: 'Edit Parameter Poster',
        poster,
        categories,
        brands,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      req.flash('error', 'Error loading parameter poster: ' + error.message);
      res.redirect('/admin/v1/content/parameter-posters');
    }
  },

  // Update parameter poster
  updateParameterPoster: async (req, res) => {
    try {
      const { title, parameterType, parameterId, status } = req.body;
      
      const updateData = {
        title,
        parameterType,
        parameterId,
        status: status || 'active'
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      await ParameterPoster.findByIdAndUpdate(req.params.id, updateData);

      req.flash('success', 'Parameter poster updated successfully');
      res.redirect('/admin/v1/content/parameter-posters');
    } catch (error) {
      req.flash('error', 'Error: ' + error.message);
      res.redirect(`/admin/v1/content/parameter-posters/${req.params.id}/edit`);
    }
  },

  // Delete parameter poster
  deleteParameterPoster: async (req, res) => {
    try {
      const poster = await ParameterPoster.findById(req.params.id);
      
      if (!poster) {
        req.flash('error', 'Parameter poster not found');
        return res.redirect('/admin/v1/content/parameter-posters');
      }

      if (poster.image) {
        const { secureDeleteFile } = require('../utils/secureFileHandler');
        const filename = poster.image.replace('/uploads/', '');
        secureDeleteFile(filename);
      }

      await ParameterPoster.findByIdAndDelete(req.params.id);
      req.flash('success', 'Parameter poster deleted successfully');
      res.redirect('/admin/v1/content/parameter-posters');
    } catch (error) {
      req.flash('error', 'Error deleting parameter poster: ' + error.message);
      res.redirect('/admin/v1/content/parameter-posters');
    }
  },

  // Public API
  apiListParameterPosters: async (req, res) => {
    try {
      const { parameterType } = req.query;
      const filter = parameterType ? { parameterType, status: 'active' } : { status: 'active' };
      const posters = await ParameterPoster.find(filter)
        .populate('parameterId', 'name')
        .sort({ createdAt: -1 });
      
      const postersWithFullUrls = posters.map(poster => ({
        ...poster.toObject(),
        image: poster.image // Already contains full URL
      }));
      
      res.json(postersWithFullUrls);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching parameter posters' });
    }
  },

  getParameterPosterById: async (req, res) => {
    try {
      const poster = await ParameterPoster.findById(req.params.id)
        .populate('parameterId', 'name');
      
      if (!poster) {
        return res.status(404).json({ error: 'Parameter poster not found' });
      }
      
      const posterWithFullUrl = {
        ...poster.toObject(),
        image: poster.image // Already contains full URL
      };
      
      res.json(posterWithFullUrl);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching parameter poster' });
    }
  },

  // API to get parameters by type
  getParametersByType: async (req, res) => {
    try {
      const { type } = req.params;
      let parameters = [];

      switch (type) {
        case 'category':
          parameters = await Category.find().select('_id name').sort({ name: 1 });
          break;
        case 'brand':
          parameters = await Brand.find().select('_id name').sort({ name: 1 });
          break;
        default:
          return res.status(400).json({ error: 'Invalid parameter type' });
      }

      res.json(parameters);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching parameters' });
    }
  }
};

module.exports = parameterPosterController;