// src/routes/v1/categories/index.js
const express = require('express');
const renderRoutes = require('./render');
const apiRoutes = require('./api');

const router = express.Router();

// Mount the routes
router.use('/', renderRoutes);  
router.use('/api', apiRoutes); 
module.exports = router;
