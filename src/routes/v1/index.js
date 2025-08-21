const express = require('express');
const router = express.Router();

// Import all route modules
const customerRoutes = require('./customer');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./order');
const wishlistRoutes = require('./wishlist');
const adminRoutes = require('./admin');
const categoryRoutes = require('./categories');
const subCategoryRoutes = require('./subCategories');
const typeRoutes = require('./types');
const brandRoutes = require('./brands');
const specListRoutes = require('./specList');
const heroCarouselRoutes = require('./heroCarousel');
const adsPanelRoutes = require('./adsPanel');
const companyInfoRoutes = require('./companyInfo');
const inventoryRoutes = require('./inventory');
const reviewRoutes = require('./reviews');

// Mount routes
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subCategoryRoutes);
router.use('/types', typeRoutes);
router.use('/brands', brandRoutes);
router.use('/spec-lists', specListRoutes);
router.use('/hero-carousel', heroCarouselRoutes);
router.use('/ads-panel', adsPanelRoutes);
router.use('/company-info', companyInfoRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reviews', reviewRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;