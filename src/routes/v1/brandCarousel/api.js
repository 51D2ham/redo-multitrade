const express = require('express');
const router = express.Router();
const brandCarousel = require('../../../controllers/brandCarouselController');

router.get('/', brandCarousel.apiListBrandCarousel);
router.get('/:id', brandCarousel.getBrandCarouselById);

module.exports = router;