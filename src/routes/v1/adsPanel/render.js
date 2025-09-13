const express = require('express');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const authMiddleware = require('../../../middlewares/auth');
const router = express.Router();
const adsPanel = require('../../../controllers/adsPanelController');

router.get('/', authMiddleware, generateCSRFToken, adsPanel.listAdsPanels);
router.get('/create', authMiddleware, generateCSRFToken, adsPanel.newAdsPanelForm);
router.post('/', authMiddleware, upload.single('image'), csrfProtection, adsPanel.createAdsPanel);
router.get('/:id', authMiddleware, generateCSRFToken, adsPanel.showAdsPanel);
router.get('/:id/edit', authMiddleware, generateCSRFToken, adsPanel.editAdsPanelForm);
router.put('/:id', authMiddleware, upload.single('image'), csrfProtection, adsPanel.updateAdsPanel);
router.delete('/:id', authMiddleware, csrfProtection, adsPanel.deleteAdsPanel);
router.post('/:id', authMiddleware, upload.single('image'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return adsPanel.updateAdsPanel(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return adsPanel.deleteAdsPanel(req, res, next);
  }
  next();
});

module.exports = router;