const salesService = require('../services/salesService');
const ExcelJS = require('exceljs');

module.exports = async function downloadComprehensiveExcel(req, res) {
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ecommerce Dashboard';
    workbook.created = new Date();

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Comprehensive Report']);
    summarySheet.addRow([`Year: ${parsedYear}`]);
    summarySheet.addRow([`Date Range: ${startDate || 'N/A'} to ${endDate || 'N/A'}`]);
    summarySheet.addRow([`Low Stock Threshold: ${parsedThreshold}`]);
    summarySheet.addRow([`Generated: ${new Date().toLocaleString('en-IN')}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Revenue', 'Total Orders', 'Average Order Value']);
    summarySheet.addRow([
      report.revenueSummary?.totalRevenue || 0,
      report.revenueSummary?.totalOrders || 0,
      report.aov?.averageOrderValue || 0
    ]);

    // 2. Monthly Sales Trend
    const monthlySheet = workbook.addWorksheet('Monthly Trend');
    monthlySheet.addRow(['Month', 'Revenue (₹)', 'Orders']);
    (report.monthlyTrend || []).forEach(row => {
      monthlySheet.addRow([
        `Month ${row.month}`,
        row.totalRevenue || 0,
        row.totalOrders || 0
      ]);
    });

    // 3. Sales by Category
    const catSheet = workbook.addWorksheet('Sales by Category');
    catSheet.addRow(['Category', 'Revenue (₹)']);
    (report.salesByCat || []).forEach(row => {
      catSheet.addRow([
        row.categoryName,
        row.totalRevenue || 0
      ]);
    });

    // 4. Top-Selling Products
    const topSheet = workbook.addWorksheet('Top Products');
    topSheet.addRow(['#', 'Product Name', 'Total Quantity', 'Total Revenue (₹)']);
    (report.topProducts || []).forEach((row, idx) => {
      topSheet.addRow([
        idx + 1,
        row.name,
        row.totalQuantity,
        row.totalRevenue || 0
      ]);
    });

    // 5. Low-Stock Alerts
    const lowStockSheet = workbook.addWorksheet('Low Stock Alerts');
    lowStockSheet.addRow(['Product Name', 'SKU', 'Remaining Stock']);
    (report.lowStockAlerts || []).forEach(row => {
      lowStockSheet.addRow([
        row.title,
        row.sku,
        row.stock
      ]);
    });

    // 6. Inventory Log Summary
    const invSheet = workbook.addWorksheet('Inventory Log');
    invSheet.addRow(['Reason', 'Month', 'Product Name', 'SKU', 'Total Change', 'Count of Events']);
    if (report.inventoryLogSummary) {
      Object.entries(report.inventoryLogSummary).forEach(([reason, monthsObj]) => {
        Object.entries(monthsObj).forEach(([month, arr]) => {
          arr.forEach(row => {
            invSheet.addRow([
              reason.charAt(0).toUpperCase() + reason.slice(1),
              ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1],
              row.productName || '-',
              row.variantSku || '-',
              row.totalChange,
              row.count
            ]);
          });
        });
      });
    }

    // 7. Price Change Events
    const priceSheet = workbook.addWorksheet('Price Changes');
    priceSheet.addRow(['SKU', 'Changed At', 'Old Price (₹)', 'New Price (₹)']);
    (report.priceChangeEvents || []).forEach(entry => {
      (entry.events || []).forEach(evt => {
        priceSheet.addRow([
          entry.variantSku,
          new Date(evt.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          evt.oldPrice || 0,
          evt.newPrice || 0
        ]);
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="comprehensive_report_${parsedYear}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).send('Failed to export comprehensive Excel');
  }
};
