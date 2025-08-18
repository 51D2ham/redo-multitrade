const express = require('express');
const upload = require('../../../middlewares/productPhoto');
const authMiddleware = require('../../../middlewares/auth');
const router = express.Router();
const heroCarousel = require('../../../controllers/heroCarouselController');


router.get('/',authMiddleware, heroCarousel.listCarouselItems);
router.get('/create',authMiddleware, heroCarousel.newCarouselItemForm);
router.post('/',authMiddleware, upload.single('image'), heroCarousel.createCarouselItem);
router.get('/:id',authMiddleware, heroCarousel.showCarouselItem);
router.get('/:id/edit',authMiddleware, heroCarousel.editCarouselItemForm);
router.put('/:id',authMiddleware, upload.single('image'), heroCarousel.updateCarouselItem);
router.delete('/:id',authMiddleware, heroCarousel.deleteCarouselItem);

module.exports = router