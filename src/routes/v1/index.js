
const router = require('express').Router();

router.use('/order', require('./order'));
router.use('/categories', require('./categories'));
router.use('/inventory', require('./inventory'));
router.use('/products', require('./products'));
router.use('/specList', require('./specList'));
router.use('/subCategories', require('./subCategories'));
router.use('/types', require('./types'));
router.use('/reviews', require('./reviews'));
router.use('/wishlist', require('./wishlist'));
router.use('/brands', require('./brands'));
router.use('/cart', require('./cart'));
router.use('/customer', require('./customer'));
router.use('/heroCarousel', require('./heroCarousel'));
router.use('/admin', require('./admin'));

module.exports = router;
