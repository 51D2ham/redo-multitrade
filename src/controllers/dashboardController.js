const InventoryService = require('../services/inventoryService');
const salesService = require('../services/salesService');

module.exports = {
  async getMainDashboard(req, res) {
    try {
      // Get comprehensive data
      const [inventoryData, salesData] = await Promise.all([
        InventoryService.getDashboardData(),
        salesService.getComprehensiveReport({
          year: new Date().getFullYear(),
          lowStockThreshold: 5
        })
      ]);

      // Merge data
      const dashboardData = {
        ...inventoryData,
        ...salesData,
        // Ensure all required fields exist
        revenueSummary: salesData.revenueSummary || { totalRevenue: 0, totalOrders: 0 },
        aov: salesData.aov || { averageOrderValue: 0, orderCount: 0 },
        topProducts: salesData.topProducts || [],
        salesByCat: salesData.salesByCat || [],
        monthlyTrend: salesData.monthlyTrend || [],
        lowStockAlerts: inventoryData.lowStockAlerts || [],
        recentMovements: inventoryData.recentMovements || [],
        salesMetrics: salesData.salesMetrics || {}
      };

      res.render('reports/newDashboard', {
        title: 'Business Dashboard',
        report: dashboardData
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('reports/newDashboard', {
        title: 'Business Dashboard',
        report: {
          totalProducts: 0,
          activeProducts: 0,
          draftProducts: 0,
          inactiveProducts: 0,
          totalVariants: 0,
          inStockVariants: 0,
          lowStockVariants: 0,
          outOfStockVariants: 0,
          stockValue: 0,
          revenueSummary: { totalRevenue: 0, totalOrders: 0 },
          aov: { averageOrderValue: 0, orderCount: 0 },
          topProducts: [],
          salesByCat: [],
          monthlyTrend: [],
          lowStockAlerts: [],
          recentMovements: [],
          salesMetrics: {}
        }
      });
    }
  }
};