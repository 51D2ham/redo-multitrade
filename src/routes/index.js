const router = require('express').Router();

// v1 routes
router.use('/v1', require('./v1'));


module.exports = router;