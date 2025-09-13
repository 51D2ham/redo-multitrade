const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const { csrfProtection, generateCSRFToken } = require('../../../middlewares/security');
const parameterPosterController = require('../../../controllers/parameterPosterController');

// Parameter poster routes
router.get('/', adminAuth, generateCSRFToken, parameterPosterController.listParameterPosters);
router.get('/new', adminAuth, generateCSRFToken, parameterPosterController.newParameterPoster);
router.post('/', adminAuth, upload.single('image'), csrfProtection, parameterPosterController.createParameterPoster);
router.get('/parameters/:type', adminAuth, parameterPosterController.getParametersByType);
router.get('/:id', adminAuth, generateCSRFToken, parameterPosterController.showParameterPoster);
router.get('/:id/edit', adminAuth, generateCSRFToken, parameterPosterController.editParameterPoster);
router.put('/:id', adminAuth, upload.single('image'), csrfProtection, parameterPosterController.updateParameterPoster);
router.delete('/:id', adminAuth, csrfProtection, parameterPosterController.deleteParameterPoster);
router.post('/:id', adminAuth, upload.single('image'), csrfProtection, (req, res, next) => {
  if (req.body._method === 'PUT') {
    return parameterPosterController.updateParameterPoster(req, res, next);
  }
  if (req.body._method === 'DELETE') {
    return parameterPosterController.deleteParameterPoster(req, res, next);
  }
  next();
});

module.exports = router;