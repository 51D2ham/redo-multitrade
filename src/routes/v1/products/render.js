const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const { csrfProtection } = require('../../../middlewares/security');
const productController = require('../../../controllers/productController');
const reviewController = require('../../../controllers/reviewController');

// Admin product routes
router.get('/', adminAuth, productController.listProducts);
router.get('/featured/ranking', adminAuth, productController.featuredProductsRanking);
router.post('/featured/update-ranking', adminAuth, productController.uploadImages, csrfProtection, productController.updateFeaturedRanking);
router.get('/new', adminAuth, productController.newProduct);
router.post('/', adminAuth, productController.uploadImages, csrfProtection, productController.createProduct);
router.get('/:id', adminAuth, productController.showProduct);
router.get('/:id/edit', adminAuth, productController.editProduct);
router.get('/:id/reviews', adminAuth, reviewController.getProductReviewsAdmin);
router.put('/:id', adminAuth, productController.uploadImages, csrfProtection, productController.updateProduct);
router.post('/:id', adminAuth, productController.uploadImages, csrfProtection, productController.updateProduct);
router.delete('/:id', adminAuth, csrfProtection, productController.deleteProduct);

module.exports = router;