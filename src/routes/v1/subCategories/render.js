const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection } = require('../../../middlewares/security');
const subCategoryController = require('../../../controllers/subCategoryController');

// SubCategory routes
router.get('/', adminAuth, subCategoryController.listSubCategories);
router.get('/new', adminAuth, subCategoryController.newSubCategory);
router.post('/', adminAuth, upload.single('icon'), csrfProtection, subCategoryController.createSubCategory);
router.get('/:id', adminAuth, subCategoryController.showSubCategory);
router.get('/:id/edit', adminAuth, subCategoryController.editSubCategory);
router.put('/:id', adminAuth, upload.single('icon'), csrfProtection, subCategoryController.updateSubCategory);
router.post('/:id', adminAuth, upload.single('icon'), csrfProtection, subCategoryController.updateSubCategory);
router.delete('/:id', adminAuth, csrfProtection, subCategoryController.deleteSubCategory);

module.exports = router;