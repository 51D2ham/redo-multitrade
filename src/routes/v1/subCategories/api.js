const express = require('express');
const router = express.Router();
const subCategoryController = require('../../../controllers/subCategoryController');

// Public API for subcategories
router.get('/', subCategoryController.getAllPublicSubCategories);
router.get('/categories/:categoryId', subCategoryController.getSubCategoriesByCategory);
router.get('/:subCategoryId/products', subCategoryController.getProductsBySubCategory);

module.exports = router;