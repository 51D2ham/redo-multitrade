const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const specListController = require('../../../controllers/specListController');

router.get('/', adminAuth, specListController.listSpecLists);
router.get('/new', adminAuth, specListController.newSpecList);
router.post('/', adminAuth, specListController.createSpecList);
router.get('/:id', adminAuth, specListController.showSpecList);
router.get('/:id/edit', adminAuth, specListController.editSpecList);
router.put('/:id', adminAuth, specListController.updateSpecList);
router.delete('/:id', adminAuth, specListController.deleteSpecList);

module.exports = router;