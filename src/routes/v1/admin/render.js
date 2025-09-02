const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../../../controllers/adminRegister');
const authMiddleware = require('../../../middlewares/auth');
const upload = require('../../../middlewares/profilePhoto');
const rbac = require('../../../middlewares/roleAccess');

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
router.get('/register',  (req, res) => res.render('admin/register'));
router.post('/register',upload.single('photo'), handleMulterError, (req, res, next) => {
  console.log('Multer Middleware - req.body:', req.body);
  console.log('Multer Middleware - req.file:', req.file);
  next();
}, adminController.registerAdmin);

// login post and get
router.get('/login', (req, res) => res.render('admin/login'));
router.post('/login', adminController.loginAdmin);
//logout post and get
router.get('/logout', adminController.logoutAdmin);
router.post('/logout', adminController.logoutAdmin);


// Password Management Routes
router.get('/change-password',authMiddleware,(req, res) => res.render('admin/change-password'));
router.post('/change-password', adminController.changePasswordRender);

router.get('/forgot-password', (req, res) => res.render('admin/forgot-password'));
router.post('/forgot-password', adminController.forgotPasswordRender);

router.get('/reset-password', (req, res) => res.render('admin/reset-password'));
router.post('/reset-password', adminController.resetPasswordRender);

// Admin Management Routes
router.get('/', authMiddleware, adminController.getAllAdminsRender);
router.get('/:id/profile', authMiddleware, adminController.getAdminProfileRender);
router.get('/:id/edit', authMiddleware,rbac('developer', 'superAdmin'), adminController.showEditAdminRender);
router.post('/:id/update', authMiddleware,rbac('developer', 'superAdmin'), upload.single('photo'), handleMulterError, adminController.updateAdminRender);
router.post('/:id/delete', authMiddleware,rbac('developer', 'superAdmin'), adminController.deleteAdminRender);

// Content dashboard controller
const renderContentDashboard = async (req, res) => {
  try {
    const HeroContent = require('../../../models/heroCarouselModel');
    const AdsPanel = require('../../../models/AdsPanelModel');
    const CompanyInfo = require('../../../models/companyInfoModel');
    const ParameterPoster = require('../../../models/parameterPosterModel');
    
    const [heroContentCount, adsPanelCount, companyInfoCount, parameterPosterCount, heroCarousel] = await Promise.all([
      HeroContent.countDocuments(),
      AdsPanel.countDocuments(),
      CompanyInfo.countDocuments(),
      ParameterPoster.countDocuments(),
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
        parameterPoster: parameterPosterCount
      },
      heroCarousel: heroCarousel || []
    });
  } catch (error) {
    console.error('Content dashboard error:', error);
    res.render('admin/content_dashboard', {
      title: 'Content Management Center',
      username: req.session.admin?.username || null,
      fullname: req.session.admin?.fullname || null,
      counts: { heroContent: 0, adsPanel: 0, companyInfo: 0, parameterPoster: 0 },
      heroCarousel: []
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