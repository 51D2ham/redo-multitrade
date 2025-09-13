// src/routes/v1/customer/index.js

const express = require('express');
const apiRoutes = require('./api');
const renderRoutes = require('./render');

const router = express.Router();

// Mount the routes
router.use('/', apiRoutes);     // API routes mounted at root since app.js already has /api/v1/customers
router.use('/', renderRoutes);  // Render routes at root

module.exports = router;
