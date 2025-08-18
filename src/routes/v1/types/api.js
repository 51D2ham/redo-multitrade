const express = require('express');
const router = express.Router();
const categoryController = require('../../../controllers/categoryController');
const subCategoryController = require('../../../controllers/subCategoryController');
const typeController = require('../../../controllers/typeController');
const brandsController = require('../../../controllers/brandsController');

// Public API for types
router.get('/', typeController.getAllPublicTypes);
router.get('/subcategories/:subCategoryId', typeController.getTypesBySubCategory);
router.get('/:typeId/products', typeController.getProductsByType);

module.exports = router;