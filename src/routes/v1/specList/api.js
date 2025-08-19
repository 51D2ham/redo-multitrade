const express = require('express');
const router = express.Router();
const specListController = require('../../../controllers/specListController');

// Public API for spec lists
router.get('/', specListController.getAllPublicSpecLists);
router.get('/filters', specListController.getFilterableSpecs);

// Product search by specifications
router.get('/products', specListController.getProductsBySpec);
router.get('/filter', specListController.filterProductsBySpecs);
router.get('/search', specListController.searchProductsBySpec);
router.get('/values', specListController.getSpecValues);

module.exports = router;