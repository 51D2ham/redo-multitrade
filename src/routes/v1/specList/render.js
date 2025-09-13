const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const specListController = require('../../../controllers/specListController');

router.get('/', adminAuth, generateCSRFToken, specListController.listSpecLists);
router.get('/new', adminAuth, generateCSRFToken, specListController.newSpecList);
router.post('/', adminAuth, upload.none(), csrfProtection, specListController.createSpecList);
router.get('/:id', adminAuth, generateCSRFToken, specListController.showSpecList);
router.get('/:id/edit', adminAuth, generateCSRFToken, specListController.editSpecList);
router.put('/:id', adminAuth, upload.none(), csrfProtection, specListController.updateSpecList);
router.delete('/:id', adminAuth, csrfProtection, specListController.deleteSpecList);
router.post('/:id', adminAuth, upload.none(), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return specListController.updateSpecList(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return specListController.deleteSpecList(req, res, next);
  }
  next();
});

module.exports = router;