const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const typeController = require('../../../controllers/typeController');

router.get('/', adminAuth, generateCSRFToken, typeController.listTypes);
router.get('/new', adminAuth, generateCSRFToken, typeController.newType);
router.post('/', adminAuth, upload.single('icon'), csrfProtection, typeController.createType);
router.get('/subcategories/:categoryId', adminAuth, typeController.getSubCategoriesByCategory);
router.get('/:id', adminAuth, generateCSRFToken, typeController.showType);
router.get('/:id/edit', adminAuth, generateCSRFToken, typeController.editType);
router.put('/:id', adminAuth, upload.single('icon'), csrfProtection, typeController.updateType);
router.delete('/:id', adminAuth, csrfProtection, typeController.deleteType);
router.post('/:id', adminAuth, upload.single('icon'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return typeController.updateType(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return typeController.deleteType(req, res, next);
  }
  next();
});

module.exports = router;