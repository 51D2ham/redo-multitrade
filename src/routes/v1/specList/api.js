const express = require('express');
const router = express.Router();
const specListController = require('../../../controllers/specListController');

// Public API for spec lists
router.get('/', specListController.getAllPublicSpecLists);

module.exports = router;