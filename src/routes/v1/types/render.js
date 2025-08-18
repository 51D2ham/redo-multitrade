const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const typeController = require('../../../controllers/typeController');

router.get('/', adminAuth, typeController.listTypes);
router.get('/new', adminAuth, typeController.newType);
router.post('/', adminAuth, typeController.createType);
router.get('/subcategories/:categoryId', adminAuth, typeController.getSubCategoriesByCategory);
router.get('/:id', adminAuth, typeController.showType);
router.get('/:id/edit', adminAuth, typeController.editType);
router.put('/:id', adminAuth, typeController.updateType);
router.delete('/:id', adminAuth, typeController.deleteType);

module.exports = router;