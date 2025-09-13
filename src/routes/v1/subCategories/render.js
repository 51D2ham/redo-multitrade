const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const subCategoryController = require('../../../controllers/subCategoryController');

// SubCategory routes
router.get('/', adminAuth, generateCSRFToken, subCategoryController.listSubCategories);
router.get('/new', adminAuth, generateCSRFToken, subCategoryController.newSubCategory);
router.post('/', adminAuth, upload.single('icon'), csrfProtection, subCategoryController.createSubCategory);
router.get('/:id', adminAuth, generateCSRFToken, subCategoryController.showSubCategory);
router.get('/:id/edit', adminAuth, generateCSRFToken, subCategoryController.editSubCategory);
router.put('/:id', adminAuth, upload.single('icon'), csrfProtection, subCategoryController.updateSubCategory);
router.delete('/:id', adminAuth, csrfProtection, subCategoryController.deleteSubCategory);
router.post('/:id', adminAuth, upload.single('icon'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return subCategoryController.updateSubCategory(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return subCategoryController.deleteSubCategory(req, res, next);
  }
  next();
});

module.exports = router;