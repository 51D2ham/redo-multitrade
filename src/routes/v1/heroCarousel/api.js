const express = require('express');
const router = express.Router();
const heroCarousel = require('../../../controllers/heroCarouselController');


router.get('/', heroCarousel.apiListCarouselItems);


module.exports= router