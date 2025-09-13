const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../../../controllers/adminRegister');
const authMiddleware = require('../../../middlewares/auth');
const upload = require('../../../middlewares/profilePhoto');
const rbac = require('../../../middlewares/roleAccess');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.render('admin/register', { message: `Multer Error: ${err.message}` });
  } else if (err) {
    return res.render('admin/register', { message: err.message });
  }
  next();
};

// Authentication Routes
router.get('/register', authMiddleware, rbac('developer', 'superAdmin'), generateCSRFToken, (req, res) => {
  console.log('Register GET route accessed by:', req.session.admin);
  res.render('admin/register', {
    error: req.flash('error'),
    success: req.flash('success'),
    old: {},
    csrfToken: res.locals.csrfToken
  });
});
router.post('/register', upload.single('photo'), handleMulterError, csrfProtection, authMiddleware, rbac('developer', 'superAdmin'), adminController.registerAdmin);

// login post and get
router.get('/login', (req, res) => {
  res.render('admin/login', {
    error: req.flash('error'),
    success: req.flash('success'),
    old: {}
  });
});
router.post('/login', csrfProtection, adminController.loginAdmin);
//logout post and get
router.get('/logout', adminController.logoutAdmin);
router.post('/logout', csrfProtection, adminController.logoutAdmin);


// Password Management Routes
router.get('/change-password', authMiddleware, (req, res) => {
  res.render('admin/change-password', {
    error: req.flash('error'),
    success: req.flash('success')
  });
});
router.post('/change-password', csrfProtection, adminController.changePasswordRender);

router.get('/forgot-password', (req, res) => {
  res.render('admin/forgot-password', {
    error: req.flash('error'),
    success: req.flash('success')
  });
});
router.post('/forgot-password', csrfProtection, adminController.forgotPasswordRender);

router.get('/reset-password', (req, res) => {
  res.render('admin/reset-password', {
    error: req.flash('error'),
    success: req.flash('success'),
    email: req.query.email || ''
  });
});
router.post('/reset-password', csrfProtection, adminController.resetPasswordRender);

// Admin Management Routes
router.get('/', authMiddleware, adminController.getAllAdminsRender);
router.get('/:id/profile', authMiddleware, adminController.getAdminProfileRender);
router.get('/:id/edit', authMiddleware,rbac('developer', 'superAdmin'), generateCSRFToken, adminController.showEditAdminRender);
router.post('/:id/update', authMiddleware,rbac('developer', 'superAdmin'), upload.single('photo'), handleMulterError, csrfProtection, adminController.updateAdminRender);
router.post('/:id/delete', authMiddleware,rbac('developer', 'superAdmin'), csrfProtection, adminController.deleteAdminRender);

// Content dashboard controller
const renderContentDashboard = async (req, res) => {
  try {
    const HeroContent = require('../../../models/heroCarouselModel');
    const AdsPanel = require('../../../models/AdsPanelModel');
    const CompanyInfo = require('../../../models/companyInfoModel');
    const ParameterPoster = require('../../../models/parameterPosterModel');
    const BrandCarousel = require('../../../models/brandCarouselModel');
    
    const [heroContentCount, adsPanelCount, companyInfoCount, parameterPosterCount, brandCarouselCount, heroCarousel] = await Promise.all([
      HeroContent.countDocuments(),
      AdsPanel.countDocuments(),
      CompanyInfo.countDocuments(),
      ParameterPoster.countDocuments(),
      BrandCarousel.countDocuments(),
      HeroContent.find().sort({ order: 1, createdAt: -1 }).limit(10)
    ]);
    
    res.render('admin/content_dashboard', {
      title: 'Content Management Center',
      username: req.session.admin?.username || null,
      fullname: req.session.admin?.fullname || null,
      counts: {
        heroContent: heroContentCount,
        adsPanel: adsPanelCount,
        companyInfo: companyInfoCount,
        parameterPoster: parameterPosterCount,
        brandCarousel: brandCarouselCount
      },
      heroCarousel: heroCarousel || [],
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Content dashboard error:', error);
    res.render('admin/content_dashboard', {
      title: 'Content Management Center',
      username: req.session.admin?.username || null,
      fullname: req.session.admin?.fullname || null,
      counts: { heroContent: 0, adsPanel: 0, companyInfo: 0, parameterPoster: 0, brandCarousel: 0 },
      heroCarousel: [],
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
};

// Dashboard Route
router.get('/dashboard', authMiddleware, adminController.renderDashboard);
router.get('/parameter-dashboard', authMiddleware, adminController.renderParameterDashboard);
router.get('/content', authMiddleware, renderContentDashboard);



// Parameters redirect route
router.get('/parameters', authMiddleware, (req, res) => {
  res.redirect('/admin/v1/staff/parameter-dashboard');
});

module.exports = router;