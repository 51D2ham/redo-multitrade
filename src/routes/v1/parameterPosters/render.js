const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middlewares/auth');
const upload = require('../../../middlewares/productPhoto');
const parameterPosterController = require('../../../controllers/parameterPosterController');

// Parameter poster routes
router.get('/', adminAuth, parameterPosterController.listParameterPosters);
router.get('/new', adminAuth, parameterPosterController.newParameterPoster);
router.post('/', adminAuth, upload.single('image'), parameterPosterController.createParameterPoster);
router.get('/parameters/:type', adminAuth, parameterPosterController.getParametersByType);
router.get('/:id', adminAuth, parameterPosterController.showParameterPoster);
router.get('/:id/edit', adminAuth, parameterPosterController.editParameterPoster);
router.put('/:id', adminAuth, upload.single('image'), parameterPosterController.updateParameterPoster);
router.delete('/:id', adminAuth, parameterPosterController.deleteParameterPoster);

module.exports = router;