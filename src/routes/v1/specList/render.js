const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection } = require('../../../middlewares/security');
const specListController = require('../../../controllers/specListController');

router.get('/', adminAuth, specListController.listSpecLists);
router.get('/new', adminAuth, specListController.newSpecList);
router.post('/', adminAuth, upload.none(), csrfProtection, specListController.createSpecList);
router.get('/:id', adminAuth, specListController.showSpecList);
router.get('/:id/edit', adminAuth, specListController.editSpecList);
router.put('/:id', adminAuth, upload.none(), csrfProtection, specListController.updateSpecList);
router.post('/:id', adminAuth, upload.none(), csrfProtection, specListController.updateSpecList);
router.delete('/:id', adminAuth, csrfProtection, specListController.deleteSpecList);

module.exports = router;