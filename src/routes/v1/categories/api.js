const express = require('express');
const router = express.Router();
const categoryController = require('../../../controllers/categoryController');


// Public API for categories
router.get('/', categoryController.getAllPublicCategories);
router.get('/hierarchy', categoryController.getCategoriesWithSubcategories);

module.exports = router;