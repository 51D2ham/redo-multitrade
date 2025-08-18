const express = require('express');
const router = express.Router();
const brandsController = require('../../../controllers/brandsController');


// Public API for brands
router.get('/', brandsController.getAllPublicBrands);
router.get('/:brandId/products', brandsController.getProductsByBrand);

module.exports = router;