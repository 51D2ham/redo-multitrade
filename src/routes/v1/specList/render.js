const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const { csrfProtection } = require('../../../middlewares/security');
const specListController = require('../../../controllers/specListController');

router.get('/', adminAuth, specListController.listSpecLists);
router.get('/new', adminAuth, specListController.newSpecList);
router.post('/', adminAuth, csrfProtection, specListController.createSpecList);
router.get('/:id', adminAuth, specListController.showSpecList);
router.get('/:id/edit', adminAuth, specListController.editSpecList);
router.put('/:id', adminAuth, csrfProtection, specListController.updateSpecList);
router.delete('/:id', adminAuth, csrfProtection, specListController.deleteSpecList);

module.exports = router;