const express = require('express');
const renderRoutes = require('./render');

const router = express.Router();

// Mount the routes
router.use('/', renderRoutes);

module.exports = router;