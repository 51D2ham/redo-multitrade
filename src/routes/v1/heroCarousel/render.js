const express = require('express');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const authMiddleware = require('../../../middlewares/auth');
const router = express.Router();
const heroCarousel = require('../../../controllers/heroCarouselController');


router.get('/', authMiddleware, generateCSRFToken, heroCarousel.listCarouselItems);
router.get('/create', authMiddleware, generateCSRFToken, heroCarousel.newCarouselItemForm);
router.post('/', authMiddleware, upload.single('image'), csrfProtection, heroCarousel.createCarouselItem);
router.get('/:id', authMiddleware, generateCSRFToken, heroCarousel.showCarouselItem);
router.get('/:id/edit', authMiddleware, generateCSRFToken, heroCarousel.editCarouselItemForm);
router.put('/:id', authMiddleware, upload.single('image'), csrfProtection, heroCarousel.updateCarouselItem);
router.delete('/:id', authMiddleware, csrfProtection, heroCarousel.deleteCarouselItem);
router.post('/:id', authMiddleware, upload.single('image'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return heroCarousel.updateCarouselItem(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return heroCarousel.deleteCarouselItem(req, res, next);
  }
  next();
});

module.exports = router