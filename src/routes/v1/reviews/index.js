const express = require('express');
const renderRoutes = require('./render');
const apiRoutes = require('./api');

const router = express.Router();

router.use('/', renderRoutes);
router.use('/api', apiRoutes);

module.exports = router;
