const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const categoryController = require('../../../controllers/categoryController');

router.get('/', adminAuth, generateCSRFToken, categoryController.listCategories);
router.get('/new', adminAuth, generateCSRFToken, categoryController.newCategory);
router.post('/', adminAuth, upload.single('icon'), csrfProtection, categoryController.createCategory);
router.get('/:id', adminAuth, generateCSRFToken, categoryController.showCategory);
router.get('/:id/edit', adminAuth, generateCSRFToken, categoryController.editCategory);
router.put('/:id', adminAuth, upload.single('icon'), csrfProtection, categoryController.updateCategory);
router.delete('/:id', adminAuth, csrfProtection, categoryController.deleteCategory);
router.post('/:id', adminAuth, upload.single('icon'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return categoryController.updateCategory(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return categoryController.deleteCategory(req, res, next);
  }
  next();
});

module.exports = router;