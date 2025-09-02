const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const brandsController = require('../../../controllers/brandsController');


router.get('/', adminAuth, brandsController.listBrands);
router.get('/new', adminAuth, brandsController.newBrand);
router.post('/', adminAuth, upload.single('logo'), brandsController.createBrand);
router.get('/:id', adminAuth, brandsController.showBrand);
router.get('/:id/edit', adminAuth, brandsController.editBrand);
router.put('/:id', adminAuth, upload.single('logo'), brandsController.updateBrand);
router.delete('/:id', adminAuth, brandsController.deleteBrand);

module.exports = router