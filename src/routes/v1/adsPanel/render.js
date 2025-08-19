const express = require('express');
const upload = require('../../../middlewares/productPhoto');
const authMiddleware = require('../../../middlewares/auth');
const router = express.Router();
const adsPanel = require('../../../controllers/adsPanelController');

router.get('/', authMiddleware, adsPanel.listAdsPanels);
router.get('/create', authMiddleware, adsPanel.newAdsPanelForm);
router.post('/', authMiddleware, upload.single('image'), adsPanel.createAdsPanel);
router.get('/:id', authMiddleware, adsPanel.showAdsPanel);
router.get('/:id/edit', authMiddleware, adsPanel.editAdsPanelForm);
router.put('/:id', authMiddleware, upload.single('image'), adsPanel.updateAdsPanel);
router.delete('/:id', authMiddleware, adsPanel.deleteAdsPanel);

module.exports = router;