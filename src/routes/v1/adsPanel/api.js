const express = require('express');
const router = express.Router();
const adsPanel = require('../../../controllers/adsPanelController');

router.get('/', adsPanel.apiListAdsPanels);
router.get('/:id', adsPanel.getAdsPanelById);

module.exports = router;