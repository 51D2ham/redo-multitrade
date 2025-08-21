const express = require('express');
const renderRoutes = require('./render');
const apiRoutes = require('./api');
const smartRoutes = require('./smart');

const router = express.Router();

// Mount the routes
router.use('/', renderRoutes);  
router.use('/api', apiRoutes);
router.use('/smart', smartRoutes);

module.exports = router;