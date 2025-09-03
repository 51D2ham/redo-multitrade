const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

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
