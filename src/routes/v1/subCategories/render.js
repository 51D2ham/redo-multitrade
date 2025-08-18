const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const subCategoryController = require('../../../controllers/subCategoryController');

// SubCategory routes
router.get('/', adminAuth, subCategoryController.listSubCategories);
router.get('/new', adminAuth, subCategoryController.newSubCategory);
router.post('/', adminAuth, subCategoryController.createSubCategory);
router.get('/:id', adminAuth, subCategoryController.showSubCategory);
router.get('/:id/edit', adminAuth, subCategoryController.editSubCategory);
router.put('/:id', adminAuth, subCategoryController.updateSubCategory);
router.delete('/:id', adminAuth, subCategoryController.deleteSubCategory);

module.exports = router;