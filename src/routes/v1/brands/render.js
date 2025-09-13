const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const brandsController = require('../../../controllers/brandsController');


router.get('/', adminAuth, generateCSRFToken, brandsController.listBrands);
router.get('/new', adminAuth, generateCSRFToken, brandsController.newBrand);
router.post('/', adminAuth, upload.single('logo'), csrfProtection, brandsController.createBrand);
router.get('/:id/edit', adminAuth, generateCSRFToken, brandsController.editBrand);
router.get('/:id', adminAuth, generateCSRFToken, brandsController.showBrand);
router.put('/:id', adminAuth, upload.single('logo'), csrfProtection, brandsController.updateBrand);
router.delete('/:id', adminAuth, csrfProtection, brandsController.deleteBrand);
router.post('/:id', adminAuth, upload.single('logo'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return brandsController.updateBrand(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return brandsController.deleteBrand(req, res, next);
  }
  next();
});

module.exports = router