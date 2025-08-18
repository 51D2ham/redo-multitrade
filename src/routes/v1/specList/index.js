const express = require('express');
const apiRoutes = require('./api');
const renderRoutes = require('./render');

const router = express.Router();

// Mount the routes
router.use('/api', apiRoutes);  // All API routes start with /api
router.use('/', renderRoutes);  // All Render routes start with / (root)

module.exports = router;
