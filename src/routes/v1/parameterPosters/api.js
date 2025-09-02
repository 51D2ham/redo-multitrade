const express = require('express');
const router = express.Router();
const parameterPoster = require('../../../controllers/parameterPosterController');

router.get('/', parameterPoster.apiListParameterPosters);
router.get('/:id', parameterPoster.getParameterPosterById);

module.exports = router;