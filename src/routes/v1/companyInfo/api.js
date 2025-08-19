const express = require('express');
const router = express.Router();
const companyInfo = require('../../../controllers/companyInfoController');

router.get('/', companyInfo.apiListCompanyInfo);
router.get('/:id', companyInfo.getCompanyInfoById);

module.exports = router;