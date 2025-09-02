const InventoryService = require('../services/inventoryService');
const salesService = require('../services/salesService');
const MixedOrderReportingService = require('../services/mixedOrderReportingService');

const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');

module.exports = {
  async getMainDashboard(req, res) {
    try {
      // Get comprehensive data including mixed order analytics
      const [inventoryData, salesData, mixedOrderData] = await Promise.all([
        InventoryService.getDashboardData(),
        salesService.getComprehensiveReport({
          year: new Date().getFullYear(),
          lowStockThreshold: 5
        }),
        MixedOrderReportingService.getOrderAnalytics({
          year: new Date().getFullYear()
        })
      ]);

      // Merge data with mixed order analytics
      const dashboardData = {
        ...inventoryData,
        ...salesData,
        // Mixed order analytics
        mixedOrderAnalytics: mixedOrderData,
        // Enhanced revenue summary (delivered items only)
        revenueSummary: {
          totalRevenue: mixedOrderData?.summary?.totalDeliveredValue || salesData.revenueSummary?.totalRevenue || 0,
          totalOrders: mixedOrderData?.summary?.revenueGeneratingOrders || salesData.revenueSummary?.totalOrders || 0,
          totalOrderValue: mixedOrderData?.summary?.totalOrderValue || 0,
          cancelledValue: mixedOrderData?.summary?.totalCancelledValue || 0
        },
        // Enhanced AOV based on delivered value
        aov: {
          averageOrderValue: mixedOrderData?.metrics?.averageDeliveredValue || salesData.aov?.averageOrderValue || 0,
          orderCount: mixedOrderData?.summary?.revenueGeneratingOrders || salesData.aov?.orderCount || 0
        },
        // Ensure all required fields exist with fallback data
        topProducts: salesData.topProducts || [],
        salesByCat: salesData.salesByCat || [],
        monthlyTrend: salesData.monthlyTrend || [],
        lowStockAlerts: inventoryData.lowStockAlerts || [],
        recentMovements: inventoryData.recentMovements || [],
        salesMetrics: {
          ...salesData.salesMetrics,
          fulfillmentRate: mixedOrderData?.metrics?.fulfillmentRate || 0,
          cancellationRate: mixedOrderData?.metrics?.cancellationRate || 0,
          mixedOrderRate: mixedOrderData?.metrics?.mixedOrderRate || 0,
          revenueEfficiency: mixedOrderData?.metrics?.revenueEfficiency || 0
        }
      };

      res.render('reports/optimizedDashboard', {
        title: 'Business Dashboard',
        report: dashboardData,
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || ''
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('reports/optimizedDashboard', {
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
          revenueSummary: { totalRevenue: 0, totalOrders: 0, cancelledValue: 0 },
          aov: { averageOrderValue: 0, orderCount: 0 },
          topProducts: [],
          salesByCat: [],
          monthlyTrend: [],
          lowStockAlerts: [],
          recentMovements: [],
          salesMetrics: { fulfillmentRate: 0, cancellationRate: 0, mixedOrderRate: 0, revenueEfficiency: 0 },
          mixedOrderAnalytics: { summary: { orderTypes: {} } }
        },
        startDate: '',
        endDate: ''
      });
    }
  },

  async exportDashboardExcel(req, res) {
    try {
      const PriceLog = require('../models/priceLogModel');
      const { Order } = require('../models/orderModel');
      
      const [inventoryData, salesData, mixedOrderData, priceChanges, recentOrders] = await Promise.all([
        InventoryService.getDashboardData(),
        salesService.getComprehensiveReport({
          year: new Date().getFullYear(),
          lowStockThreshold: 5
        }),
        MixedOrderReportingService.getOrderAnalytics({
          year: new Date().getFullYear()
        }),
        PriceLog.find({
          changedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('product', 'title').sort({ changedAt: -1 }).limit(100).catch(() => []),
        Order.find().populate('user', 'fullname email').sort({ createdAt: -1 }).limit(50).catch(() => [])
      ]);
      
      // Get inventory movements from the service
      const inventoryMovements = await InventoryService.getMovementReport({ limit: 100 }).catch(() => ({ movements: [] }));

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Multitrade Admin';
      workbook.created = new Date();
      
      // Summary Sheet with comprehensive metrics
      const summarySheet = workbook.addWorksheet('Executive Summary');
      summarySheet.columns = [{ header: 'Metric', key: 'metric', width: 30 }, { header: 'Value', key: 'value', width: 20 }, { header: 'Details', key: 'details', width: 40 }];
      
      const summaryData = [
        { metric: 'Report Generated', value: new Date().toLocaleString(), details: 'Export timestamp' },
        { metric: 'Total Revenue (Delivered)', value: `₹${(mixedOrderData.summary.totalDeliveredValue || 0).toLocaleString()}`, details: 'Revenue from successfully delivered items only' },
        { metric: 'Total Order Value', value: `₹${(mixedOrderData.summary.totalOrderValue || 0).toLocaleString()}`, details: 'Total value of all orders placed' },
        { metric: 'Cancelled Value', value: `₹${(mixedOrderData.summary.totalCancelledValue || 0).toLocaleString()}`, details: 'Value lost due to cancellations' },
        { metric: 'Revenue Efficiency', value: `${((mixedOrderData.metrics.revenueEfficiency || 0) * 100).toFixed(1)}%`, details: 'Delivered value vs total order value' },
        { metric: 'Fulfillment Rate', value: `${((mixedOrderData.metrics.fulfillmentRate || 0) * 100).toFixed(1)}%`, details: 'Orders with at least one delivered item' },
        { metric: 'Mixed Order Rate', value: `${((mixedOrderData.metrics.mixedOrderRate || 0) * 100).toFixed(1)}%`, details: 'Orders with both delivered and cancelled items' },
        { metric: 'Average Order Value', value: `₹${(salesData.aov?.averageOrderValue || 0).toLocaleString()}`, details: 'Based on delivered items only' },
        { metric: 'Total Products', value: inventoryData.totalProducts || 0, details: 'All products in catalog' },
        { metric: 'Active Products', value: inventoryData.activeProducts || 0, details: 'Products available for sale' },
        { metric: 'Total Variants', value: inventoryData.totalVariants || 0, details: 'All product variants' },
        { metric: 'In Stock Variants', value: inventoryData.inStockVariants || 0, details: 'Variants with stock > 0' },
        { metric: 'Low Stock Alerts', value: (inventoryData.lowStockAlerts || []).length, details: 'Items below threshold' },
        { metric: 'Out of Stock', value: inventoryData.outOfStockVariants || 0, details: 'Variants with zero stock' },
        { metric: 'Total Stock Value', value: `₹${(inventoryData.stockValue || 0).toLocaleString()}`, details: 'Current inventory value' },
        { metric: 'Price Changes (30d)', value: priceChanges.length, details: 'Recent price modifications' }
      ];
      
      summarySheet.addRows(summaryData);
      summarySheet.getRow(1).font = { bold: true };
      
      // Monthly Trend Sheet
      const trendSheet = workbook.addWorksheet('Monthly Trend');
      trendSheet.columns = [{ header: 'Month', key: 'month', width: 15 }, { header: 'Revenue', key: 'revenue', width: 15 }, { header: 'Orders', key: 'orders', width: 10 }];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      (salesData.monthlyTrend || []).forEach(trend => {
        trendSheet.addRow({
          month: monthNames[trend.month - 1],
          revenue: `₹${trend.totalRevenue.toLocaleString()}`,
          orders: trend.totalOrders
        });
      });
      trendSheet.getRow(1).font = { bold: true };
      
      // Top Products Sheet with detailed metrics
      const productsSheet = workbook.addWorksheet('Top Products');
      productsSheet.columns = [
        { header: 'Rank', key: 'rank', width: 8 },
        { header: 'Product Name', key: 'name', width: 40 },
        { header: 'Quantity Sold', key: 'quantity', width: 15 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Avg Price', key: 'avgPrice', width: 12 }
      ];
      (salesData.topProducts || []).forEach((product, index) => {
        productsSheet.addRow({
          rank: index + 1,
          name: product.name,
          quantity: product.totalQuantity,
          revenue: `₹${product.totalRevenue.toLocaleString()}`,
          avgPrice: `₹${(product.totalRevenue / product.totalQuantity).toFixed(2)}`
        });
      });
      productsSheet.getRow(1).font = { bold: true };
      
      // Order Analytics Sheet
      const orderSheet = workbook.addWorksheet('Order Analytics');
      orderSheet.columns = [
        { header: 'Order Type', key: 'type', width: 25 },
        { header: 'Count', key: 'count', width: 10 },
        { header: 'Percentage', key: 'percentage', width: 12 }
      ];
      const orderTypes = mixedOrderData.summary?.orderTypes || {};
      const totalOrders = Object.values(orderTypes).reduce((sum, count) => sum + count, 0);
      Object.entries({
        'Fully Delivered': orderTypes.fully_delivered || 0,
        'Fully Cancelled': orderTypes.fully_cancelled || 0,
        'Mixed Status': orderTypes.mixed_delivered_cancelled || 0,
        'Partially Delivered': orderTypes.partially_delivered || 0,
        'Pending/Processing': orderTypes.pending_processing || 0
      }).forEach(([type, count]) => {
        orderSheet.addRow({
          type,
          count,
          percentage: totalOrders > 0 ? `${((count / totalOrders) * 100).toFixed(1)}%` : '0%'
        });
      });
      orderSheet.getRow(1).font = { bold: true };
      
      // Price Changes Sheet
      const priceSheet = workbook.addWorksheet('Price Changes (30d)');
      priceSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Old Price', key: 'oldPrice', width: 12 },
        { header: 'New Price', key: 'newPrice', width: 12 },
        { header: 'Change', key: 'change', width: 12 },
        { header: 'Change %', key: 'changePercent', width: 12 }
      ];
(priceChanges || []).forEach(change => {
        const priceDiff = (change.newPrice || 0) - (change.oldPrice || 0);
        const changePercent = (change.oldPrice || 0) > 0 ? ((priceDiff / change.oldPrice) * 100).toFixed(1) : 0;
        priceSheet.addRow({
          date: new Date(change.changedAt || Date.now()).toLocaleDateString(),
          product: change.product?.title || 'Unknown Product',
          sku: change.variantSku || 'N/A',
          oldPrice: `₹${(change.oldPrice || 0).toLocaleString()}`,
          newPrice: `₹${(change.newPrice || 0).toLocaleString()}`,
          change: `₹${priceDiff.toLocaleString()}`,
          changePercent: `${changePercent}%`
        });
      });
      priceSheet.getRow(1).font = { bold: true };
      
      // Low Stock Sheet with enhanced details
      const lowStockSheet = workbook.addWorksheet('Low Stock Alerts');
      lowStockSheet.columns = [
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Current Stock', key: 'stock', width: 15 },
        { header: 'Threshold', key: 'threshold', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Days Out of Stock', key: 'daysOut', width: 18 },
        { header: 'Restock Priority', key: 'priority', width: 18 }
      ];
      (inventoryData.lowStockAlerts || []).forEach(alert => {
        const currentStock = alert.stock || alert.currentStock || 0;
        const status = currentStock === 0 ? 'Out of Stock' : currentStock <= 2 ? 'Critical' : 'Low Stock';
        const priority = currentStock === 0 ? 'URGENT' : currentStock <= 2 ? 'HIGH' : 'MEDIUM';
        lowStockSheet.addRow({
          product: alert.title || alert.productTitle,
          sku: alert.sku || alert.variantSku,
          stock: currentStock,
          threshold: alert.threshold || 5,
          status,
          daysOut: currentStock === 0 ? 'Unknown' : 'N/A',
          priority
        });
      });
      lowStockSheet.getRow(1).font = { bold: true };
      
      // Inventory Movements Sheet
      const movementsSheet = workbook.addWorksheet('Inventory Movements');
      movementsSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Reason', key: 'reason', width: 20 }
      ];
      (Array.isArray(inventoryMovements) ? inventoryMovements : []).forEach(movement => {
        movementsSheet.addRow({
          date: new Date(movement.createdAt).toLocaleDateString(),
          product: movement.productTitle || 'Unknown Product',
          sku: movement.variantSku,
          type: movement.type,
          quantity: movement.quantity,
          reason: movement.notes || movement.type
        });
      });
      movementsSheet.getRow(1).font = { bold: true };
      
      // Recent Orders Sheet
      const ordersSheet = workbook.addWorksheet('Recent Orders');
      ordersSheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Items', key: 'items', width: 10 },
        { header: 'Total Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Payment', key: 'payment', width: 12 }
      ];
(recentOrders || []).forEach(order => {
        ordersSheet.addRow({
          orderId: (order._id || '').toString().slice(-8),
          date: new Date(order.createdAt || Date.now()).toLocaleDateString(),
          customer: order.user?.fullname || 'Guest',
          items: order.items?.length || 0,
          amount: `₹${(order.totalPrice || 0).toLocaleString()}`,
          status: order.status || 'pending',
          payment: order.paid ? 'Paid' : 'Unpaid'
        });
      });
      ordersSheet.getRow(1).font = { bold: true };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="comprehensive-dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({ error: 'Export failed', details: error.message });
    }
  },

  async exportDashboardCSV(req, res) {
    try {
      const PriceLog = require('../models/priceLogModel');
      const { Order } = require('../models/orderModel');
      
      const [inventoryData, salesData, mixedOrderData, priceChanges, recentOrders] = await Promise.all([
        InventoryService.getDashboardData(),
        salesService.getComprehensiveReport({
          year: new Date().getFullYear(),
          lowStockThreshold: 5
        }),
        MixedOrderReportingService.getOrderAnalytics({
          year: new Date().getFullYear()
        }),
        PriceLog.find({
          changedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('product', 'title').sort({ changedAt: -1 }).limit(50).catch(() => []),
        Order.find().populate('user', 'fullname').sort({ createdAt: -1 }).limit(25).catch(() => [])
      ]);

      const csvData = [
        // Executive Summary
        { section: 'Executive Summary', metric: 'Report Generated', value: new Date().toISOString(), details: 'Export timestamp' },
        { section: 'Executive Summary', metric: 'Total Revenue (Delivered)', value: mixedOrderData.summary.totalDeliveredValue || 0, details: 'Revenue from delivered items only' },
        { section: 'Executive Summary', metric: 'Total Order Value', value: mixedOrderData.summary.totalOrderValue || 0, details: 'Total value of all orders' },
        { section: 'Executive Summary', metric: 'Cancelled Value', value: mixedOrderData.summary.totalCancelledValue || 0, details: 'Value lost to cancellations' },
        { section: 'Executive Summary', metric: 'Revenue Efficiency %', value: ((mixedOrderData.metrics.revenueEfficiency || 0) * 100).toFixed(1), details: 'Delivered vs total order value' },
        { section: 'Executive Summary', metric: 'Fulfillment Rate %', value: ((mixedOrderData.metrics.fulfillmentRate || 0) * 100).toFixed(1), details: 'Orders with delivered items' },
        { section: 'Executive Summary', metric: 'Mixed Order Rate %', value: ((mixedOrderData.metrics.mixedOrderRate || 0) * 100).toFixed(1), details: 'Orders with mixed status' },
        { section: 'Executive Summary', metric: 'Average Order Value', value: salesData.aov?.averageOrderValue || 0, details: 'Based on delivered items' },
        { section: 'Executive Summary', metric: 'Total Products', value: inventoryData.totalProducts || 0, details: 'All products in catalog' },
        { section: 'Executive Summary', metric: 'Active Products', value: inventoryData.activeProducts || 0, details: 'Available for sale' },
        { section: 'Executive Summary', metric: 'Low Stock Alerts', value: (inventoryData.lowStockAlerts || []).length, details: 'Items below threshold' },
        { section: 'Executive Summary', metric: 'Stock Value', value: inventoryData.stockValue || 0, details: 'Current inventory value' },
        { section: 'Executive Summary', metric: 'Price Changes (30d)', value: (priceChanges || []).length, details: 'Recent price modifications' },
        
        // Top Products
        ...((salesData.topProducts || []).slice(0, 10).map((product, index) => ({
          section: 'Top Products',
          metric: `#${index + 1} ${product.name}`,
          value: product.totalRevenue,
          details: `${product.totalQuantity} units sold, Avg: ₹${(product.totalRevenue / product.totalQuantity).toFixed(2)}`
        }))),
        
        // Monthly Trend
        ...((salesData.monthlyTrend || []).map(trend => {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            section: 'Monthly Trend',
            metric: monthNames[trend.month - 1],
            value: trend.totalRevenue,
            details: `${trend.totalOrders} orders`
          };
        })),
        
        // Order Analytics
        ...(Object.entries(mixedOrderData.summary?.orderTypes || {}).map(([type, count]) => {
          const totalOrders = Object.values(mixedOrderData.summary?.orderTypes || {}).reduce((sum, c) => sum + c, 1);
          return {
            section: 'Order Analytics',
            metric: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: count || 0,
            details: `${((count || 0) / totalOrders * 100).toFixed(1)}% of total orders`
          };
        })),
        
        // Price Changes
        ...((priceChanges || []).slice(0, 20).map(change => {
          const priceDiff = change.newPrice - change.oldPrice;
          const changePercent = change.oldPrice > 0 ? ((priceDiff / change.oldPrice) * 100).toFixed(1) : 0;
          return {
            section: 'Price Changes',
            metric: `${change.product?.title || 'Unknown'} (${change.variantSku})`,
            value: change.newPrice,
            details: `From ₹${change.oldPrice} to ₹${change.newPrice} (${changePercent}%) on ${new Date(change.changedAt).toLocaleDateString()}`
          };
        })),
        
        // Low Stock Alerts
        ...((inventoryData.lowStockAlerts || []).slice(0, 20).map(alert => {
          const currentStock = alert.stock || alert.currentStock || 0;
          const status = currentStock === 0 ? 'Out of Stock' : currentStock <= 2 ? 'Critical' : 'Low Stock';
          return {
            section: 'Low Stock Alerts',
            metric: `${alert.title || alert.productTitle} (${alert.sku || alert.variantSku})`,
            value: currentStock,
            details: `${status} - Threshold: ${alert.threshold || 5}`
          };
        })),
        
        // Recent Orders
        ...((recentOrders || []).slice(0, 15).map(order => ({
          section: 'Recent Orders',
          metric: `Order #${order._id.toString().slice(-8)}`,
          value: order.totalPrice || 0,
          details: `${order.user?.fullname || 'Guest'} - ${order.items?.length || 0} items - ${new Date(order.createdAt).toLocaleDateString()}`
        })))
      ];

      const parser = new Parser({ fields: ['section', 'metric', 'value', 'details'] });
      const csv = parser.parse(csvData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comprehensive-dashboard-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: 'Export failed', details: error.message });
    }
  }
};