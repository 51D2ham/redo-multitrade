// controllers/reportController.js

const { StatusCodes } = require('http-status-codes');
const salesService = require('../services/salesService');
const { Parser } = require('json2csv');
const downloadComprehensiveExcel = require('./downloadComprehensiveExcel');

module.exports = {
  /**
   * GET /admin/reports/comprehensive
   * Query Params:
   *   - startDate (ISO string)
   *   - endDate   (ISO string)
   *   - year      (integer, e.g. 2025)
   *   - lowStockThreshold (integer, default 5)
   *
   * Returns a big JSON with all metrics, or renders a “dashboard” EJS if Accepts('html').
   */
  async getComprehensiveReport(req, res) {
    try {
      const { startDate, endDate, year, lowStockThreshold } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const parsedThreshold = Math.max(parseInt(lowStockThreshold, 10) || 5, 0);

      const InventoryService = require('../services/inventoryService');
      
      // Get both sales and inventory data in parallel
      const [salesReport, inventoryData] = await Promise.all([
        salesService.getComprehensiveReport({
          startDate,
          endDate,
          year: parsedYear,
          lowStockThreshold: parsedThreshold
        }).catch(err => {
          console.error('Sales service error:', err);
          return {
            revenueSummary: { totalRevenue: 0, totalOrders: 0 },
            aov: { averageOrderValue: 0, orderCount: 0 },
            topProducts: [],
            salesByCat: [],
            monthlyTrend: [],
            salesMetrics: { totalItemsSold: 0, uniqueProductCount: 0, avgItemsPerOrder: 0, maxOrderValue: 0, minOrderValue: 0 },
            recentOrders: []
          };
        }),
        InventoryService.getDashboardData().catch(err => {
          console.error('Inventory service error:', err);
          return {
            lowStockAlerts: [],
            recentMovements: [],
            totalProducts: 0,
            totalVariants: 0,
            activeProducts: 0,
            draftProducts: 0,
            inStockVariants: 0,
            lowStockVariants: 0,
            outOfStockVariants: 0,
            stockValue: 0
          };
        })
      ]);

      // Merge sales and inventory data
      // Transform recent movements into a Map for quick lookup
      const movementsMap = new Map();
      if (inventoryData.recentMovements && Array.isArray(inventoryData.recentMovements)) {
        inventoryData.recentMovements.forEach(movement => {
          if (movement.variantSku) {
            const key = movement.variantSku;
            if (!movementsMap.has(key) || movementsMap.get(key).createdAt < movement.createdAt) {
              movementsMap.set(key, movement);
            }
          }
        });
      }

      // Process low stock alerts to include last sale data
      const lowStockAlerts = (inventoryData.lowStockAlerts || []).map(alert => ({
        ...alert,
        lastSale: movementsMap.get(alert.variantSku) || null
      }));

      // Count critical stock (items with stock <= 2)
      const criticalStockCount = lowStockAlerts.filter(item => item.remainingStock <= 2).length;

      const report = {
        ...salesReport,
        ...inventoryData,
        lowStockThreshold: parsedThreshold,
        // Ensure we have all required properties with proper defaults
        revenueSummary: {
          totalRevenue: salesReport?.revenueSummary?.totalRevenue || 0,
          totalOrders: salesReport?.revenueSummary?.totalOrders || 0
        },
        monthlyTrend: salesReport?.monthlyTrend || [],
        salesByCat: salesReport?.salesByCat || [],
        topProducts: salesReport?.topProducts || [],
        recentMovements: Array.isArray(inventoryData.recentMovements) ? inventoryData.recentMovements : [],
        lowStockAlerts,
        criticalStockCount,
        stockValue: parseFloat(inventoryData?.stockValue || 0),
        totalProducts: parseInt(inventoryData?.totalProducts || 0, 10),
        totalVariants: parseInt(inventoryData?.totalVariants || 0, 10)
      };



      if (req.accepts('html')) {
        return res.render('reports/optimizedDashboard', {
          title: 'Business Dashboard',
          report,
          startDate,
          endDate,
          year: parsedYear,
          lowStockThreshold: parsedThreshold
        });
      }

      return res.status(StatusCodes.OK).json({ success: true, data: report });
    } catch (err) {
      console.error('getComprehensiveReport error:', err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch comprehensive report'
      });
    }
  },

  async downloadComprehensiveCSV(req, res) {
    try {
      const { startDate, endDate, year, lowStockThreshold } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const parsedThreshold = Math.max(parseInt(lowStockThreshold, 10) || 5, 0);
      const report = await salesService.getComprehensiveReport({
        startDate,
        endDate,
        year: parsedYear,
        lowStockThreshold: parsedThreshold
      });
      // Build a comprehensive, professional CSV with all key sections
      let csvSections = [];
      // 1. Revenue Summary
      csvSections.push('--- Revenue Summary ---');
      csvSections.push('Total Revenue,Total Orders,Average Order Value');
      csvSections.push([
        (report.revenueSummary?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        report.revenueSummary?.totalOrders || 0,
        (report.aov?.averageOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ].join(','));
      // 2. Monthly Sales Trend
      csvSections.push('\n--- Monthly Sales Trend ---');
      csvSections.push('Month,Revenue (₹),Orders');
      (report.monthlyTrend || []).forEach(row => {
        csvSections.push([
          `Month ${row.month}`,
          row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00',
          row.totalOrders || 0
        ].join(','));
      });
      // 3. Sales by Category
      csvSections.push('\n--- Sales by Category ---');
      csvSections.push('Category,Revenue (₹)');
      (report.salesByCat || []).forEach(row => {
        csvSections.push([
          row.categoryName,
          row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'
        ].join(','));
      });
      // 4. Top-Selling Products
      csvSections.push('\n--- Top-Selling Products ---');
      csvSections.push('#,Product Name,Total Quantity,Total Revenue (₹)');
      (report.topProducts || []).forEach((row, idx) => {
        csvSections.push([
          idx + 1,
          row.name,
          row.totalQuantity,
          row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'
        ].join(','));
      });
      // 5. Low-Stock Alerts
      csvSections.push(`\n--- Low-Stock Alerts (≤ ${parsedThreshold} units) ---`);
      csvSections.push('Product Name,SKU,Remaining Stock');
      (report.lowStockAlerts || []).forEach(row => {
        csvSections.push([
          row.title,
          row.sku,
          row.stock
        ].join(','));
      });
      // 6. Inventory Log Summary
      csvSections.push('\n--- Inventory Log Summary ---');
      if (report.inventoryLogSummary) {
        Object.entries(report.inventoryLogSummary).forEach(([reason, arr]) => {
          csvSections.push(`Reason: ${reason.charAt(0).toUpperCase() + reason.slice(1)}`);
          csvSections.push('Month,Total Change,Count of Events');
          arr.forEach(row => {
            csvSections.push([
              row.month,
              row.totalChange,
              row.count
            ].join(','));
          });
        });
      }
      // 7. Price Change Events
      csvSections.push('\n--- Price Change Events ---');
      csvSections.push('SKU,Changed At,Old Price (₹),New Price (₹)');
      (report.priceChangeEvents || []).forEach(entry => {
        (entry.events || []).forEach(evt => {
          csvSections.push([
            entry.variantSku,
            new Date(evt.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            evt.oldPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00',
            evt.newPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'
          ].join(','));
        });
      });
      // Final CSV
      const csv = csvSections.join('\n');
      res.header('Content-Type', 'text/csv');
      res.attachment(`comprehensive_report_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export comprehensive CSV');
    }
  },

  // --- Per-section CSV export handlers (PDF removed) ---
  async downloadMonthlyTrendCSV(req, res) {
    try {
      const { startDate, endDate, year } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear });
      const fields = [
        { label: 'Month', value: row => `Month ${row.month}` },
        { label: 'Revenue (₹)', value: row => row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00' },
        { label: 'Orders', value: 'totalOrders' }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(report.monthlyTrend || []);
      res.header('Content-Type', 'text/csv');
      res.attachment(`monthly_trend_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Monthly Trend CSV');
    }
  },
  async downloadCategorySalesCSV(req, res) {
    try {
      const { startDate, endDate, year } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear });
      const fields = [
        { label: 'Category', value: 'categoryName' },
        { label: 'Revenue (₹)', value: row => row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00' }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(report.salesByCat || []);
      res.header('Content-Type', 'text/csv');
      res.attachment(`category_sales_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Category Sales CSV');
    }
  },
  async downloadTopProductsCSV(req, res) {
    try {
      const { startDate, endDate, year, by } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      // If requested 'by=revenue', pull revenue-sorted list, otherwise quantity-sorted
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear });
      const byMode = (by || 'quantity').toLowerCase();
      const dataSource = byMode === 'revenue' ? report.topProductsByRevenue : report.topProducts;

      const fields = [
        { label: '#', value: (row, idx) => idx + 1 },
        { label: 'Product Name', value: 'name' },
        { label: 'Total Quantity', value: 'totalQuantity' },
        { label: 'Total Revenue (₹)', value: row => row.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00' }
      ];
      // Add index for row number
      const data = (dataSource || []).map((row, idx) => ({ ...row, idx }));
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`top_products_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Top Products CSV');
    }
  },
  async downloadLowStockCSV(req, res) {
    try {
      const { startDate, endDate, year, lowStockThreshold } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const parsedThreshold = Math.max(parseInt(lowStockThreshold, 10) || 5, 0);
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear, lowStockThreshold: parsedThreshold });
      const fields = [
        { label: 'Product Name', value: 'title' },
        { label: 'SKU', value: 'sku' },
        { label: 'Remaining Stock', value: 'stock' }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(report.lowStockAlerts || []);
      res.header('Content-Type', 'text/csv');
      res.attachment(`low_stock_alerts_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Low Stock CSV');
    }
  },
  async downloadInventoryLogCSV(req, res) {
    try {
      const { startDate, endDate, year } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear });
      // Flatten inventory log summary for CSV
      const rows = [];
      if (report.inventoryLogSummary) {
        Object.entries(report.inventoryLogSummary).forEach(([reason, arr]) => {
          arr.forEach(row => rows.push({ Reason: reason.charAt(0).toUpperCase() + reason.slice(1), ...row }));
        });
      }
      const fields = [
        { label: 'Reason', value: 'Reason' },
        { label: 'Month', value: 'month' },
        { label: 'Total Change', value: 'totalChange' },
        { label: 'Count of Events', value: 'count' }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(rows);
      res.header('Content-Type', 'text/csv');
      res.attachment(`inventory_log_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Inventory Log CSV');
    }
  },
  async downloadPriceChangesCSV(req, res) {
    try {
      const { startDate, endDate, year } = req.query;
      const parsedYear = Math.max(parseInt(year, 10) || new Date().getFullYear(), 1970);
      const report = await salesService.getComprehensiveReport({ startDate, endDate, year: parsedYear });
      // Flatten price change events for CSV
      const rows = [];
      (report.priceChangeEvents || []).forEach(entry => {
        (entry.events || []).forEach(evt => {
          rows.push({
            SKU: entry.variantSku,
            'Changed At': new Date(evt.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            'Old Price (₹)': evt.oldPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00',
            'New Price (₹)': evt.newPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'
          });
        });
      });
      const fields = [
        { label: 'SKU', value: 'SKU' },
        { label: 'Changed At', value: 'Changed At' },
        { label: 'Old Price (₹)', value: 'Old Price (₹)' },
        { label: 'New Price (₹)', value: 'New Price (₹)' }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(rows);
      res.header('Content-Type', 'text/csv');
      res.attachment(`price_changes_${parsedYear}.csv`);
      return res.send(csv);
    } catch (err) {
      res.status(500).send('Failed to export Price Changes CSV');
    }
  },

  downloadComprehensiveExcel,

  // (Optional) If you still want separate endpoints, uncomment these:
  /*
  async getRevenueSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const summary = await salesService.getRevenueSummary({ startDate, endDate });
      if (req.accepts('html')) {
        return res.render('reports/revenueSummary', { summary, startDate, endDate });
      }
      return res.status(StatusCodes.OK).json({ success: true, data: summary });
    } catch (err) {
      console.error(err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Error' });
    }
  },

  async getAverageOrderValue(req, res) { … },
  async getTopSellingProducts(req, res) { … },
  async getSalesByCategory(req, res) { … },
  async getLowStockAlerts(req, res) { … },
  async getMonthlySalesTrend(req, res) { … },
  async getInventoryLogSummary(req, res) { … },
  async getPriceChangeEvents(req, res) { … },
  */

  // In your backend CSV/PDF export logic (reportController.js):
  // 1. Add section headers and explanations to the exported files.
  // 2. For CSV, include summary rows, section dividers, and clear column headers.
  // 3. For PDF, use titles, subtitles, and section descriptions for each data block.
  // 4. Add a report generation date/time and filter summary at the top of each export.
  // 5. For each section (summary, charts, tables), add a short description before the data.
  // 6. For PDF, use bold/large fonts for section titles and subtle lines/dividers for clarity.
};
