const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const { csrfProtection } = require('../../../middlewares/security');
const productController = require('../../../controllers/productController');
const reviewController = require('../../../controllers/reviewController');

// Admin product routes
router.get('/', adminAuth, productController.listProducts);
router.get('/new', adminAuth, productController.newProduct);
router.post('/', adminAuth, csrfProtection, productController.uploadImages, productController.createProduct);
router.get('/:id', adminAuth, productController.showProduct);
router.get('/:id/edit', adminAuth, productController.editProduct);
router.get('/:id/reviews', adminAuth, reviewController.getProductReviewsAdmin);
router.put('/:id', adminAuth, productController.uploadImages, productController.updateProduct);
router.delete('/:id', adminAuth, csrfProtection, productController.deleteProduct);

module.exports = router;