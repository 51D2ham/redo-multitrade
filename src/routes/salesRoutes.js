// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const reportCtrl = require('../controllers/reportController');
const authMiddleware = require('../middlewares/auth');
const rbac = require('../middlewares/roleAccess');

router.get(
  '/reports/comprehensive',
  authMiddleware,
  reportCtrl.getComprehensiveReport
);
router.get(
  '/reports/comprehensive/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadComprehensiveCSV
);
router.get(
  '/reports/comprehensive/excel',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadComprehensiveExcel
);

// --- Per-section CSV export endpoints ONLY (PDF removed) ---
router.get(
  '/reports/comprehensive/monthly-trend/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadMonthlyTrendCSV
);

router.get(
  '/reports/comprehensive/category-sales/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadCategorySalesCSV
);
router.get(
  '/reports/comprehensive/top-products/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadTopProductsCSV
);
router.get(
  '/reports/comprehensive/low-stock/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadLowStockCSV
);
router.get(
  '/reports/comprehensive/inventory-log/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadInventoryLogCSV
);
router.get(
  '/reports/comprehensive/price-changes/csv',
  authMiddleware,rbac('developer', 'superAdmin'),
  reportCtrl.downloadPriceChangesCSV
);

// (If you still want each sub-report individually, uncomment below:)
/*
router.get('/reports/revenue', ensureAdmin, reportCtrl.getRevenueSummary);
router.get('/reports/aov', ensureAdmin, reportCtrl.getAverageOrderValue);
router.get('/reports/top-products', ensureAdmin, reportCtrl.getTopSellingProducts);
router.get('/reports/sales-by-category', ensureAdmin, reportCtrl.getSalesByCategory);
router.get('/reports/low-stock', ensureAdmin, reportCtrl.getLowStockAlerts);
router.get('/reports/monthly-trend', ensureAdmin, reportCtrl.getMonthlySalesTrend);
router.get('/reports/inventory-log', ensureAdmin, reportCtrl.getInventoryLogSummary);
router.get('/reports/price-changes', ensureAdmin, reportCtrl.getPriceChangeEvents);
*/

module.exports = router;
