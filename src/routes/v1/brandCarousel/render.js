const express = require('express');
const router = express.Router();
const brandCarousel = require('../../../controllers/brandCarouselController');
const requireAuth = require('../../../middlewares/auth');

router.use(requireAuth);

router.get('/', brandCarousel.listBrandCarousel);
router.get('/new', brandCarousel.newBrandCarouselForm);
router.post('/', brandCarousel.createBrandCarousel);
router.get('/:id', brandCarousel.showBrandCarousel);
router.get('/:id/edit', brandCarousel.editBrandCarouselForm);
router.put('/:id', brandCarousel.updateBrandCarousel);
router.delete('/:id', brandCarousel.deleteBrandCarousel);

module.exports = router;