const express = require('express');
const router = express.Router();
const brandCarousel = require('../../../controllers/brandCarouselController');
const requireAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');

router.get('/', requireAuth, generateCSRFToken, brandCarousel.listBrandCarousel);
router.get('/new', requireAuth, generateCSRFToken, brandCarousel.newBrandCarouselForm);
router.post('/', requireAuth, upload.single('image'), csrfProtection, brandCarousel.createBrandCarousel);
router.get('/:id', requireAuth, generateCSRFToken, brandCarousel.showBrandCarousel);
router.get('/:id/edit', requireAuth, generateCSRFToken, brandCarousel.editBrandCarouselForm);
router.post('/:id', requireAuth, csrfProtection, upload.single('image'), (req, res, next) => {
  if (req.body._method === 'PUT') {
    return brandCarousel.updateBrandCarousel(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return brandCarousel.deleteBrandCarousel(req, res, next);
  }
  next();
});

module.exports = router;