const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const categoryController = require('../../../controllers/categoryController');

router.get('/', adminAuth, categoryController.listCategories);
router.get('/new', adminAuth, categoryController.newCategory);
router.post('/', adminAuth, categoryController.createCategory);
router.get('/:id', adminAuth, categoryController.showCategory);
router.get('/:id/edit', adminAuth, categoryController.editCategory);
router.put('/:id', adminAuth, categoryController.updateCategory);
router.delete('/:id', adminAuth, categoryController.deleteCategory);

module.exports = router;