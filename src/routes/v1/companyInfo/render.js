const express = require('express');
const upload = require('../../../middlewares/productPhoto');
const authMiddleware = require('../../../middlewares/auth');
const router = express.Router();
const companyInfo = require('../../../controllers/companyInfoController');

router.get('/', authMiddleware, companyInfo.listCompanyInfo);
router.get('/create', authMiddleware, companyInfo.newCompanyInfoForm);
router.post('/', authMiddleware, upload.single('logo'), companyInfo.createCompanyInfo);
router.get('/:id', authMiddleware, companyInfo.showCompanyInfo);
router.get('/:id/edit', authMiddleware, companyInfo.editCompanyInfoForm);
router.put('/:id', authMiddleware, upload.single('logo'), companyInfo.updateCompanyInfo);
router.delete('/:id', authMiddleware, companyInfo.deleteCompanyInfo);

module.exports = router;