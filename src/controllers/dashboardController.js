const InventoryService = require('../services/inventoryService');
const salesService = require('../services/salesService');
const MixedOrderReportingService = require('../services/mixedOrderReportingService');

const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');

module.exports = {
  async getMainDashboard(req, res) {
    res.redirect('/admin/reports/comprehensive');
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
        MixedOrderReportingService.generateRevenueImpactReport({
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date()
        }).catch(() => ({
          totalOrders: 0, mixedOrders: 0, totalRevenue: 0, deliveredRevenue: 0,
          cancelledRevenue: 0, activeRevenue: 0, revenueRealizationRate: 0,
          revenueLossRate: 0, mixedOrderImpact: 0
        })),
        PriceLog.find({
          changedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('product', 'title').sort({ changedAt: -1 }).limit(100).catch(() => []),
        Order.find().populate('user', 'fullname email').sort({ createdAt: -1 }).limit(50).catch(() => [])
      ]);
      
      // Get inventory movements directly from database for accuracy
      const InventoryLog = require('../models/inventoryLogModel');
      const inventoryMovements = await InventoryLog.find({})
        .populate('product', 'title')
        .populate('admin', 'fullname')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .catch(() => []);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Multitrade Admin';
      workbook.created = new Date();
      
      // Summary Sheet with comprehensive metrics
      const summarySheet = workbook.addWorksheet('Executive Summary');
      summarySheet.columns = [{ header: 'Metric', key: 'metric', width: 30 }, { header: 'Value', key: 'value', width: 20 }, { header: 'Details', key: 'details', width: 40 }];
      
      const summaryData = [
        { metric: 'Report Generated', value: new Date().toLocaleString(), details: 'Export timestamp' },
        { metric: 'Total Revenue (Delivered)', value: `Rs ${(mixedOrderData.deliveredRevenue || 0).toLocaleString()}`, details: 'Revenue from successfully delivered items only' },
        { metric: 'Total Order Value', value: `Rs ${(mixedOrderData.totalRevenue || 0).toLocaleString()}`, details: 'Total value of all orders placed' },
        { metric: 'Cancelled Value', value: `Rs ${(mixedOrderData.cancelledRevenue || 0).toLocaleString()}`, details: 'Value lost due to cancellations' },
        { metric: 'Revenue Efficiency', value: `${(mixedOrderData.revenueRealizationRate || 0).toFixed(1)}%`, details: 'Delivered value vs total order value' },
        { metric: 'Mixed Order Rate', value: `${(mixedOrderData.mixedOrderImpact || 0).toFixed(1)}%`, details: 'Orders with mixed item statuses' },
        { metric: 'Average Order Value', value: `Rs ${(salesData.aov?.averageOrderValue || 0).toLocaleString()}`, details: 'Based on delivered items only' },
        { metric: 'Total Products', value: inventoryData.totalProducts || 0, details: 'All products in catalog' },
        { metric: 'Active Products', value: inventoryData.activeProducts || 0, details: 'Products available for sale' },
        { metric: 'Total Variants', value: inventoryData.totalVariants || 0, details: 'All product variants' },
        { metric: 'In Stock Variants', value: inventoryData.inStockVariants || 0, details: 'Variants with stock > 0' },
        { metric: 'Low Stock Alerts', value: (inventoryData.lowStockAlerts || []).length, details: 'Items below threshold' },
        { metric: 'Out of Stock', value: inventoryData.outOfStockVariants || 0, details: 'Variants with zero stock' },
        { metric: 'Total Stock Value', value: `Rs ${(inventoryData.stockValue || 0).toLocaleString()}`, details: 'Current inventory value' },
        { metric: 'Price Changes (30d)', value: priceChanges.length, details: 'Recent price modifications' },
        { metric: 'Inventory Movements (Recent)', value: (inventoryMovements || []).length, details: 'Recent stock movements tracked' }
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
          revenue: `Rs ${trend.totalRevenue.toLocaleString()}`,
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
          revenue: `Rs ${product.totalRevenue.toLocaleString()}`,
          avgPrice: `Rs ${(product.totalRevenue / product.totalQuantity).toFixed(2)}`
        });
      });
      productsSheet.getRow(1).font = { bold: true };
      
      // Premium Order Analytics Dashboard
      const orderSheet = workbook.addWorksheet('📊 Order Analytics');
      
      // Extract order data first
      const totalOrders = mixedOrderData.totalOrders || 0;
      const mixedOrders = mixedOrderData.mixedOrders || 0;
      const deliveredRevenue = mixedOrderData.deliveredRevenue || 0;
      const totalRevenue = mixedOrderData.totalRevenue || 0;
      const cancelledRevenue = mixedOrderData.cancelledRevenue || 0;
      const revenueRealizationRate = mixedOrderData.revenueRealizationRate || 0;
      const revenueLossRate = mixedOrderData.revenueLossRate || 0;
      
      // Dashboard Title
      orderSheet.mergeCells('A1:G3');
      orderSheet.getCell('A1').value = '📊 ORDER ANALYTICS DASHBOARD';
      orderSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFFFFF' } };
      orderSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      orderSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
      
      // Key Metrics Cards
      orderSheet.getRow(5).height = 35;
      const metricsCards = [
        { range: 'A5:B5', value: `${totalOrders.toLocaleString()} ORDERS`, color: '4472C4' },
        { range: 'C5:D5', value: `${revenueRealizationRate.toFixed(1)}% DELIVERED`, color: revenueRealizationRate > 90 ? '70AD47' : 'FFC000' },
        { range: 'E5:F5', value: `Rs ${(deliveredRevenue/1000000).toFixed(1)}M REVENUE`, color: '70AD47' },
        { range: 'G5:G5', value: `${totalOrders > 0 ? ((totalOrders-mixedOrders)/totalOrders*100).toFixed(0) : 0}% CLEAN`, color: totalOrders > 0 && ((totalOrders-mixedOrders)/totalOrders*100) > 85 ? '70AD47' : 'E74C3C' }
      ];
      
      metricsCards.forEach(card => {
        orderSheet.mergeCells(card.range);
        const cell = orderSheet.getCell(card.range.split(':')[0]);
        cell.value = card.value;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.color } };
      });
      
      // Analytics Table Headers
      orderSheet.getRow(7).values = ['#', 'CATEGORY', 'METRIC', 'VALUE', 'RATE', 'BENCHMARK', 'STATUS'];
      orderSheet.getRow(7).font = { bold: true, color: { argb: 'FFFFFF' } };
      orderSheet.getRow(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
      orderSheet.getRow(7).height = 25;
      
      // Column widths
      orderSheet.columns = [{ width: 6 }, { width: 18 }, { width: 32 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 16 }];
      
      const analytics = [
        ['1.0', '📦 ORDER VOLUME', 'Total Orders Processed', totalOrders.toLocaleString(), '100%', 'Growth', totalOrders > 50 ? '✅ Strong' : '⚠️ Growing'],
        ['1.1', '', 'Clean Orders (Single Status)', (totalOrders-mixedOrders).toLocaleString(), totalOrders > 0 ? `${((totalOrders-mixedOrders)/totalOrders*100).toFixed(1)}%` : '0%', '> 85%', totalOrders > 0 && ((totalOrders-mixedOrders)/totalOrders*100) > 85 ? '✅ Excellent' : '❌ Review'],
        ['1.2', '', 'Mixed Status Orders', mixedOrders.toLocaleString(), totalOrders > 0 ? `${(mixedOrders/totalOrders*100).toFixed(1)}%` : '0%', '< 15%', totalOrders > 0 && (mixedOrders/totalOrders*100) < 15 ? '✅ Good' : '❌ High'],
        
        ['2.0', '💰 REVENUE METRICS', 'Total Order Value', `Rs ${(totalRevenue/1000000).toFixed(2)}M`, '100%', 'Target', '📈 Monitor'],
        ['2.1', '', 'Successfully Delivered', `Rs ${(deliveredRevenue/1000000).toFixed(2)}M`, `${revenueRealizationRate.toFixed(1)}%`, '> 90%', revenueRealizationRate > 90 ? '✅ Excellent' : revenueRealizationRate > 80 ? '⚠️ Good' : '❌ Poor'],
        ['2.2', '', 'Lost to Cancellations', `Rs ${(cancelledRevenue/1000000).toFixed(2)}M`, `${revenueLossRate.toFixed(1)}%`, '< 10%', revenueLossRate < 10 ? '✅ Minimal' : '❌ High'],
        
        ['3.0', '⚡ EFFICIENCY METRICS', 'Revenue Realization Rate', `${revenueRealizationRate.toFixed(1)}%`, 'Delivered/Total', '> 90%', revenueRealizationRate > 90 ? '✅ Efficient' : '⚠️ Optimize'],
        ['3.1', '', 'Order Processing Quality', totalOrders > 0 ? `${(100-(mixedOrders/totalOrders)*100).toFixed(1)}%` : '0%', 'Clean Rate', '> 85%', totalOrders > 0 && (100-(mixedOrders/totalOrders)*100) > 85 ? '✅ High' : '⚠️ Review'],
        ['3.2', '', 'Fulfillment Consistency', totalOrders > 0 ? `${(((totalOrders-mixedOrders)/totalOrders)*100).toFixed(1)}%` : '0%', 'Single Status', '> 85%', totalOrders > 0 && (((totalOrders-mixedOrders)/totalOrders)*100) > 85 ? '✅ Consistent' : '⚠️ Variable'],
        
        ['4.0', '💎 FINANCIAL KPIs', 'Average Order Value', totalOrders > 0 ? `Rs ${Math.round(totalRevenue/totalOrders).toLocaleString()}` : 'Rs 0', 'Per Order', 'Industry', '📊 Track'],
        ['4.1', '', 'Realized AOV (Delivered)', totalOrders > 0 ? `Rs ${Math.round(deliveredRevenue/totalOrders).toLocaleString()}` : 'Rs 0', 'Delivered', 'Target', '💰 Monitor'],
        ['4.2', '', 'Revenue Per Clean Order', (totalOrders-mixedOrders) > 0 ? `Rs ${Math.round(deliveredRevenue/(totalOrders-mixedOrders)).toLocaleString()}` : 'Rs 0', 'Clean Orders', 'Optimize', '🎯 Focus']
      ];
      
      analytics.forEach((row, index) => {
        const rowNum = 8 + index;
        orderSheet.getRow(rowNum).values = row;
        
        // Number column styling
        const numberCell = orderSheet.getCell(`A${rowNum}`);
        if (row[0].includes('.0')) {
          numberCell.font = { bold: true, color: { argb: '2E75B6' } };
          numberCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F8FF' } };
        } else {
          numberCell.font = { color: { argb: '666666' } };
        }
        
        // Category styling
        if (row[1].includes('📦') || row[1].includes('💰') || row[1].includes('⚡') || row[1].includes('💎')) {
          orderSheet.getRow(rowNum).font = { bold: true, color: { argb: '2E75B6' } };
          orderSheet.getRow(rowNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7F3FF' } };
          orderSheet.getRow(rowNum).height = 22;
        } else {
          orderSheet.getRow(rowNum).height = 18;
        }
        
        // Status formatting
        const statusCell = orderSheet.getCell(`G${rowNum}`);
        if (row[6].includes('✅')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
          statusCell.font = { bold: true, color: { argb: '006100' } };
        } else if (row[6].includes('⚠️')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB9C' } };
          statusCell.font = { bold: true, color: { argb: '9C5700' } };
        } else if (row[6].includes('❌')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
          statusCell.font = { bold: true, color: { argb: 'C00000' } };
        } else if (row[6].includes('📊') || row[6].includes('💰') || row[6].includes('🎯')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } };
          statusCell.font = { bold: true, color: { argb: '0066CC' } };
        }
      });
      
      // Executive Summary
      const summaryRow = 8 + analytics.length + 2;
      orderSheet.mergeCells(`A${summaryRow}:G${summaryRow}`);
      orderSheet.getCell(`A${summaryRow}`).value = '📋 EXECUTIVE SUMMARY & RECOMMENDATIONS';
      orderSheet.getCell(`A${summaryRow}`).font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
      orderSheet.getCell(`A${summaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
      orderSheet.getCell(`A${summaryRow}`).alignment = { horizontal: 'center' };
      orderSheet.getRow(summaryRow).height = 30;
      
      const summary = [
        ['5.1', '🎯 Overall Performance', revenueRealizationRate > 85 && revenueLossRate < 15 ? '🟢 EXCELLENT - System performing optimally' : revenueRealizationRate > 70 ? '🟡 GOOD - Minor optimization needed' : '🔴 NEEDS ATTENTION - Immediate action required'],
        ['5.2', '💡 Primary Focus Area', mixedOrders > totalOrders * 0.15 ? '🔴 Reduce Mixed Orders - High complexity detected' : mixedOrders > totalOrders * 0.10 ? '🟡 Monitor Order Quality - Moderate complexity' : '🟢 Maintain Excellence - Low complexity rate'],
        ['5.3', '📈 Revenue Opportunity', `Potential Recovery: Rs ${(cancelledRevenue/1000000).toFixed(1)}M (${revenueLossRate.toFixed(1)}% of total value)`],
        ['5.4', '🏆 Performance Score', `${Math.round((revenueRealizationRate + (100-revenueLossRate))/2)}% Overall Efficiency Rating`],
        ['5.5', '🎯 Next Action', revenueRealizationRate < 80 ? '🔴 URGENT: Review fulfillment process' : mixedOrders > totalOrders * 0.15 ? '🟡 OPTIMIZE: Reduce order complexity' : '🟢 MAINTAIN: Continue current practices']
      ];
      
      summary.forEach((row, index) => {
        const rowNum = summaryRow + 1 + index;
        orderSheet.getCell(`A${rowNum}`).value = row[0];
        orderSheet.getCell(`B${rowNum}`).value = row[1];
        orderSheet.getCell(`C${rowNum}`).value = row[2];
        orderSheet.mergeCells(`C${rowNum}:G${rowNum}`);
        orderSheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: '2E75B6' } };
        orderSheet.getCell(`B${rowNum}`).font = { bold: true };
        orderSheet.getRow(rowNum).height = 20;
        
        // Color coding for summary items
        if (row[2].includes('🟢')) {
          orderSheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
        } else if (row[2].includes('🟡')) {
          orderSheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E1' } };
        } else if (row[2].includes('🔴')) {
          orderSheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
        }
      });
      
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
          oldPrice: `Rs ${(change.oldPrice || 0).toLocaleString()}`,
          newPrice: `Rs ${(change.newPrice || 0).toLocaleString()}`,
          change: `Rs ${priceDiff.toLocaleString()}`,
          changePercent: `${changePercent}%`
        });
      });
      priceSheet.getRow(1).font = { bold: true };
      
      // Inventory Movements Sheet
      const movementsSheet = workbook.addWorksheet('Recent Inventory Movements');
      movementsSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Movement Type', key: 'movementType', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Reference', key: 'reference', width: 20 }
      ];
      (inventoryMovements || []).forEach(movement => {
        movementsSheet.addRow({
          date: new Date(movement.createdAt || Date.now()).toLocaleDateString(),
          product: movement.product?.title || 'Unknown Product',
          sku: movement.variantSku || 'N/A',
          movementType: movement.type || 'Unknown',
          quantity: `${movement.type === 'sale' ? '-' : '+'}${movement.quantity || 0}`,
          reference: movement.orderId ? `Order #${movement.orderId.toString().slice(-8)}` : (movement.notes || 'Manual')
        });
      });
      movementsSheet.getRow(1).font = { bold: true };
      
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
          amount: `Rs ${(order.totalPrice || 0).toLocaleString()}`,
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
      
      const [inventoryData, salesData, mixedOrderData, priceChanges, recentOrders, inventoryMovements] = await Promise.all([
        InventoryService.getDashboardData(),
        salesService.getComprehensiveReport({
          year: new Date().getFullYear(),
          lowStockThreshold: 5
        }),
        MixedOrderReportingService.generateRevenueImpactReport({
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date()
        }).catch(() => ({
          totalOrders: 0, mixedOrders: 0, totalRevenue: 0, deliveredRevenue: 0,
          cancelledRevenue: 0, activeRevenue: 0, revenueRealizationRate: 0,
          revenueLossRate: 0, mixedOrderImpact: 0
        })),
        PriceLog.find({
          changedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('product', 'title').sort({ changedAt: -1 }).limit(50).catch(() => []),
        Order.find().populate('user', 'fullname').sort({ createdAt: -1 }).limit(25).catch(() => []),
        InventoryLog.find({})
          .populate('product', 'title')
          .populate('admin', 'fullname')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
          .catch(() => [])
      ]);

      const csvData = [
        // Executive Summary
        { section: 'Executive Summary', metric: 'Report Generated', value: new Date().toISOString(), details: 'Export timestamp' },
        { section: 'Executive Summary', metric: 'Total Revenue (Delivered)', value: mixedOrderData.deliveredRevenue || 0, details: 'Revenue from delivered items only' },
        { section: 'Executive Summary', metric: 'Total Order Value', value: mixedOrderData.totalRevenue || 0, details: 'Total value of all orders' },
        { section: 'Executive Summary', metric: 'Cancelled Value', value: mixedOrderData.cancelledRevenue || 0, details: 'Value lost to cancellations' },
        { section: 'Executive Summary', metric: 'Revenue Efficiency %', value: (mixedOrderData.revenueRealizationRate || 0).toFixed(1), details: 'Delivered vs total order value' },
        { section: 'Executive Summary', metric: 'Mixed Order Rate %', value: (mixedOrderData.mixedOrderImpact || 0).toFixed(1), details: `${mixedOrderData.mixedOrders || 0} of ${mixedOrderData.totalOrders || 0} orders have mixed status` },
        { section: 'Executive Summary', metric: 'Order Fulfillment Quality %', value: ((100 - ((mixedOrderData.mixedOrders || 0) / (mixedOrderData.totalOrders || 1) * 100)).toFixed(1)), details: 'Clean order fulfillment rate' },
        { section: 'Executive Summary', metric: 'Average Order Value', value: salesData.aov?.averageOrderValue || 0, details: 'Based on delivered items' },
        { section: 'Executive Summary', metric: 'Total Products', value: inventoryData.totalProducts || 0, details: 'All products in catalog' },
        { section: 'Executive Summary', metric: 'Active Products', value: inventoryData.activeProducts || 0, details: 'Available for sale' },
        { section: 'Executive Summary', metric: 'Low Stock Alerts', value: (inventoryData.lowStockAlerts || []).length, details: 'Items below threshold' },
        { section: 'Executive Summary', metric: 'Stock Value', value: inventoryData.stockValue || 0, details: 'Current inventory value' },
        { section: 'Executive Summary', metric: 'Price Changes (30d)', value: (priceChanges || []).length, details: 'Recent price modifications' },
        { section: 'Executive Summary', metric: 'Inventory Movements (Recent)', value: (inventoryMovements || []).length, details: 'Recent stock movements tracked' },
        
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
        
          // Enhanced Order Analytics
        { section: 'Order Analytics', metric: 'Total Orders', value: mixedOrderData.totalOrders || 0, details: 'All orders placed in period' },
        { section: 'Order Analytics', metric: 'Mixed Status Orders', value: mixedOrderData.mixedOrders || 0, details: `${((mixedOrderData.mixedOrders || 0) / (mixedOrderData.totalOrders || 1) * 100).toFixed(1)}% of total orders` },
        { section: 'Order Analytics', metric: 'Clean Orders', value: (mixedOrderData.totalOrders || 0) - (mixedOrderData.mixedOrders || 0), details: 'Orders with single status (all delivered/cancelled)' },
        { section: 'Order Analytics', metric: 'Revenue Realization Rate', value: (mixedOrderData.revenueRealizationRate || 0).toFixed(1), details: 'Percentage of order value actually delivered' },
        { section: 'Order Analytics', metric: 'Revenue Loss Rate', value: (mixedOrderData.revenueLossRate || 0).toFixed(1), details: 'Percentage of order value lost to cancellations' },
        { section: 'Order Analytics', metric: 'Order Fulfillment Quality', value: ((100 - ((mixedOrderData.mixedOrders || 0) / (mixedOrderData.totalOrders || 1) * 100)).toFixed(1)), details: 'Percentage of orders with clean fulfillment' },
        { section: 'Order Analytics', metric: 'Average Order Value (Total)', value: (mixedOrderData.totalOrders || 0) > 0 ? ((mixedOrderData.totalRevenue || 0) / (mixedOrderData.totalOrders || 1)).toFixed(0) : 0, details: 'Average value per order placed' },
        { section: 'Order Analytics', metric: 'Average Delivered Value', value: (mixedOrderData.totalOrders || 0) > 0 ? ((mixedOrderData.deliveredRevenue || 0) / (mixedOrderData.totalOrders || 1)).toFixed(0) : 0, details: 'Average delivered value per order' },
        
        // Price Changes
        ...((priceChanges || []).slice(0, 20).map(change => {
          const priceDiff = change.newPrice - change.oldPrice;
          const changePercent = change.oldPrice > 0 ? ((priceDiff / change.oldPrice) * 100).toFixed(1) : 0;
          return {
            section: 'Price Changes',
            metric: `${change.product?.title || 'Unknown'} (${change.variantSku})`,
            value: change.newPrice,
            details: `From Rs ${change.oldPrice} to Rs ${change.newPrice} (${changePercent}%) on ${new Date(change.changedAt).toLocaleDateString()}`
          };
        })),
        
        // Inventory Movements
        ...((inventoryMovements || []).slice(0, 15).map(movement => ({
          section: 'Inventory Movements',
          metric: `${movement.product?.title || 'Unknown Product'} (${movement.variantSku || 'N/A'})`,
          value: movement.quantity || 0,
          details: `${movement.type || 'Unknown'} - ${new Date(movement.createdAt || Date.now()).toLocaleDateString()} - ${movement.orderId ? `Order #${movement.orderId.toString().slice(-8)}` : (movement.notes || 'Manual')}`
        }))),
        
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
          details: `${order.user?.fullname || 'Guest'} - ${order.items?.length || 0} items - Rs ${order.totalPrice || 0} - ${new Date(order.createdAt).toLocaleDateString()}`
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