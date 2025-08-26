const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const productController = require('../../../controllers/productController');
const reviewController = require('../../../controllers/reviewController');

// Admin product routes
router.get('/', adminAuth, productController.listProducts);
router.get('/new', adminAuth, productController.newProduct);
router.post('/', adminAuth, productController.uploadImages, productController.createProduct);
router.get('/:id', adminAuth, productController.showProduct);
router.get('/:id/reviews', adminAuth, reviewController.getProductReviewsAdmin);
router.get('/:id/edit', adminAuth, productController.editProduct);
router.put('/:id', adminAuth, productController.uploadImages, productController.updateProduct);
router.delete('/:id', adminAuth, productController.deleteProduct);

module.exports = router;