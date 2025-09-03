const express = require('express');
const router = express.Router();
const productController = require('../../../controllers/productController');

// Public product API routes
router.get('/', productController.getAllProducts);
router.get('/filters', productController.getProductFilters);
router.post('/specifications', productController.getSpecificationsByIds);
router.get('/:id', productController.getProductById);

module.exports = router;