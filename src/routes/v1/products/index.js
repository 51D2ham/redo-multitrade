const express = require('express');
const renderRoutes = require('./render');
const apiRoutes = require('./api');

const router = express.Router();

// Admin routes (EJS templates)
router.use('/', renderRoutes);

// Public API routes
router.use('/api', apiRoutes);

module.exports = router;