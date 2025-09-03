/**
 * Mixed Order Reporting Service
 * Generates comprehensive reports for orders with mixed item statuses
 */

const { Order } = require('../models/orderModel');
const { Product } = require('../models/productModel');
const Sale = require('../models/saleModel');
const mongoose = require('mongoose');

class MixedOrderReportingService {
  /**
   * Generate comprehensive mixed order report
   * @param {Object} filters - Report filters
   * @returns {Object} Comprehensive report data
   */
  static async generateMixedOrderReport(filters = {}) {
    const { startDate, endDate, status, includeItems = true } = filters;
    
    try {
      // Build match criteria
      const matchCriteria = {};
      if (startDate || endDate) {
        matchCriteria.createdAt = {};
        if (startDate) matchCriteria.createdAt.$gte = new Date(startDate);
        if (endDate) matchCriteria.createdAt.$lte = new Date(endDate);
      }
      if (status) matchCriteria.status = status;

      // Get orders with item-level analysis
      const orders = await Order.find(matchCriteria)
        .populate('user', 'fullname email')
        .populate('shippingAddress')
        .lean();

      const report = {
        summary: {
          totalOrders: orders.length,
          mixedStatusOrders: 0,
          fullyDeliveredOrders: 0,
          fullyCancelledOrders: 0,
          partiallyFulfilledOrders: 0,
          totalRevenue: 0,
          deliveredRevenue: 0,
          activeRevenue: 0,
          lostRevenue: 0
        },
        statusBreakdown: {
          pending: { count: 0, revenue: 0 },
          processing: { count: 0, revenue: 0 },
          shipped: { count: 0, revenue: 0 },
          delivered: { count: 0, revenue: 0 },
          cancelled: { count: 0, revenue: 0 }
        },
        itemAnalysis: {
          totalItems: 0,
          deliveredItems: 0,
          cancelledItems: 0,
          activeItems: 0,
          fulfillmentRate: 0
        },
        revenueAnalysis: {
          averageOrderValue: 0,
          averageDeliveredValue: 0,
          revenueLossRate: 0,
          partialFulfillmentImpact: 0
        },
        orders: includeItems ? [] : undefined
      };

      // Process each order
      for (const order of orders) {
        const orderAnalysis = this.analyzeOrder(order);
        
        // Update summary
        report.summary.totalRevenue += order.totalPrice;
        report.summary.deliveredRevenue += orderAnalysis.deliveredRevenue;
        report.summary.activeRevenue += orderAnalysis.activeRevenue;
        report.summary.lostRevenue += orderAnalysis.cancelledRevenue;

        // Categorize order type
        if (orderAnalysis.isMixed) {
          report.summary.mixedStatusOrders++;
        }
        if (orderAnalysis.isFullyDelivered) {
          report.summary.fullyDeliveredOrders++;
        }
        if (orderAnalysis.isFullyCancelled) {
          report.summary.fullyCancelledOrders++;
        }
        if (orderAnalysis.isPartiallyFulfilled) {
          report.summary.partiallyFulfilledOrders++;
        }

        // Update status breakdown
        report.statusBreakdown[order.status].count++;
        report.statusBreakdown[order.status].revenue += orderAnalysis.activeRevenue + orderAnalysis.deliveredRevenue;

        // Update item analysis
        report.itemAnalysis.totalItems += orderAnalysis.totalItems;
        report.itemAnalysis.deliveredItems += orderAnalysis.deliveredItems;
        report.itemAnalysis.cancelledItems += orderAnalysis.cancelledItems;
        report.itemAnalysis.activeItems += orderAnalysis.activeItems;

        // Add to detailed orders if requested
        if (includeItems) {
          report.orders.push({
            ...order,
            analysis: orderAnalysis
          });
        }
      }

      // Calculate derived metrics
      if (report.summary.totalOrders > 0) {
        report.revenueAnalysis.averageOrderValue = report.summary.totalRevenue / report.summary.totalOrders;
        
        const ordersWithDeliveries = report.summary.fullyDeliveredOrders + report.summary.partiallyFulfilledOrders;
        if (ordersWithDeliveries > 0) {
          report.revenueAnalysis.averageDeliveredValue = report.summary.deliveredRevenue / ordersWithDeliveries;
        }
        
        report.revenueAnalysis.revenueLossRate = (report.summary.lostRevenue / report.summary.totalRevenue) * 100;
        report.revenueAnalysis.partialFulfillmentImpact = (report.summary.mixedStatusOrders / report.summary.totalOrders) * 100;
      }

      if (report.itemAnalysis.totalItems > 0) {
        const nonCancelledItems = report.itemAnalysis.totalItems - report.itemAnalysis.cancelledItems;
        if (nonCancelledItems > 0) {
          report.itemAnalysis.fulfillmentRate = (report.itemAnalysis.deliveredItems / nonCancelledItems) * 100;
        }
      }

      return report;

    } catch (error) {
      console.error('Mixed order report generation error:', error);
      throw new Error(`Failed to generate mixed order report: ${error.message}`);
    }
  }

  /**
   * Analyze individual order for mixed status patterns
   * @param {Object} order - Order object
   * @returns {Object} Order analysis
   */
  static analyzeOrder(order) {
    const analysis = {
      orderId: order._id,
      totalItems: order.items?.length || 0,
      deliveredItems: 0,
      cancelledItems: 0,
      activeItems: 0,
      deliveredRevenue: 0,
      cancelledRevenue: 0,
      activeRevenue: 0,
      statusCounts: {},
      isMixed: false,
      isFullyDelivered: false,
      isFullyCancelled: false,
      isPartiallyFulfilled: false,
      fulfillmentRate: 0
    };

    if (!order.items || order.items.length === 0) {
      return analysis;
    }

    // Analyze each item
    order.items.forEach(item => {
      const status = item.status || 'pending';
      const itemValue = item.totalPrice || 0;

      // Count by status
      analysis.statusCounts[status] = (analysis.statusCounts[status] || 0) + 1;

      // Categorize and sum revenue
      if (status === 'delivered') {
        analysis.deliveredItems++;
        analysis.deliveredRevenue += itemValue;
      } else if (status === 'cancelled') {
        analysis.cancelledItems++;
        analysis.cancelledRevenue += itemValue;
      } else {
        analysis.activeItems++;
        analysis.activeRevenue += itemValue;
      }
    });

    // Determine order characteristics
    const uniqueStatuses = Object.keys(analysis.statusCounts).length;
    analysis.isMixed = uniqueStatuses > 1;
    analysis.isFullyDelivered = analysis.deliveredItems === analysis.totalItems;
    analysis.isFullyCancelled = analysis.cancelledItems === analysis.totalItems;
    analysis.isPartiallyFulfilled = analysis.deliveredItems > 0 && analysis.deliveredItems < (analysis.totalItems - analysis.cancelledItems);

    // Calculate fulfillment rate
    const nonCancelledItems = analysis.totalItems - analysis.cancelledItems;
    if (nonCancelledItems > 0) {
      analysis.fulfillmentRate = (analysis.deliveredItems / nonCancelledItems) * 100;
    }

    return analysis;
  }

  /**
   * Generate revenue impact report for mixed orders
   * @param {Object} filters - Report filters
   * @returns {Object} Revenue impact analysis
   */
  static async generateRevenueImpactReport(filters = {}) {
    try {
      const { startDate, endDate } = filters;
      
      const pipeline = [
        {
          $match: {
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) })
              }
            } : {})
          }
        },
        {
          $addFields: {
            deliveredRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$items',
                      cond: { $eq: ['$$this.status', 'delivered'] }
                    }
                  },
                  as: 'item',
                  in: '$$item.totalPrice'
                }
              }
            },
            cancelledRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$items',
                      cond: { $eq: ['$$this.status', 'cancelled'] }
                    }
                  },
                  as: 'item',
                  in: '$$item.totalPrice'
                }
              }
            },
            activeRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$items',
                      cond: { $nin: [['$$this.status'], ['delivered', 'cancelled']] }
                    }
                  },
                  as: 'item',
                  in: '$$item.totalPrice'
                }
              }
            },
            isMixed: {
              $gt: [
                {
                  $size: {
                    $setUnion: [
                      { $map: { input: '$items', as: 'item', in: '$$item.status' } }
                    ]
                  }
                },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            mixedOrders: { $sum: { $cond: ['$isMixed', 1, 0] } },
            totalRevenue: { $sum: '$totalPrice' },
            deliveredRevenue: { $sum: '$deliveredRevenue' },
            cancelledRevenue: { $sum: '$cancelledRevenue' },
            activeRevenue: { $sum: '$activeRevenue' },
            avgOrderValue: { $avg: '$totalPrice' },
            avgDeliveredValue: { $avg: '$deliveredRevenue' }
          }
        }
      ];

      const result = await Order.aggregate(pipeline);
      const data = result[0] || {
        totalOrders: 0,
        mixedOrders: 0,
        totalRevenue: 0,
        deliveredRevenue: 0,
        cancelledRevenue: 0,
        activeRevenue: 0,
        avgOrderValue: 0,
        avgDeliveredValue: 0
      };

      // Calculate impact metrics
      const revenueRealizationRate = data.totalRevenue > 0 ? 
        (data.deliveredRevenue / data.totalRevenue) * 100 : 0;
      
      const revenueLossRate = data.totalRevenue > 0 ? 
        (data.cancelledRevenue / data.totalRevenue) * 100 : 0;
      
      const mixedOrderImpact = data.totalOrders > 0 ? 
        (data.mixedOrders / data.totalOrders) * 100 : 0;

      return {
        ...data,
        revenueRealizationRate: Math.round(revenueRealizationRate * 100) / 100,
        revenueLossRate: Math.round(revenueLossRate * 100) / 100,
        mixedOrderImpact: Math.round(mixedOrderImpact * 100) / 100,
        potentialRevenue: data.deliveredRevenue + data.activeRevenue
      };

    } catch (error) {
      console.error('Revenue impact report error:', error);
      throw new Error(`Failed to generate revenue impact report: ${error.message}`);
    }
  }

  /**
   * Generate product performance report considering mixed orders
   * @param {Object} filters - Report filters
   * @returns {Object} Product performance data
   */
  static async generateProductPerformanceReport(filters = {}) {
    try {
      const { startDate, endDate, limit = 50 } = filters;
      
      const pipeline = [
        {
          $match: {
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) })
              }
            } : {})
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              productId: '$items.productId',
              variantSku: '$items.variantSku',
              status: '$items.status'
            },
            productTitle: { $first: '$items.productTitle' },
            count: { $sum: 1 },
            quantity: { $sum: '$items.qty' },
            revenue: { $sum: '$items.totalPrice' }
          }
        },
        {
          $group: {
            _id: {
              productId: '$_id.productId',
              variantSku: '$_id.variantSku'
            },
            productTitle: { $first: '$productTitle' },
            totalOrders: { $sum: '$count' },
            totalQuantity: { $sum: '$quantity' },
            totalRevenue: { $sum: '$revenue' },
            deliveredQuantity: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'delivered'] }, '$quantity', 0] }
            },
            deliveredRevenue: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'delivered'] }, '$revenue', 0] }
            },
            cancelledQuantity: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'cancelled'] }, '$quantity', 0] }
            },
            cancelledRevenue: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'cancelled'] }, '$revenue', 0] }
            },
            statusBreakdown: {
              $push: {
                status: '$_id.status',
                quantity: '$quantity',
                revenue: '$revenue'
              }
            }
          }
        },
        {
          $addFields: {
            fulfillmentRate: {
              $cond: [
                { $gt: [{ $subtract: ['$totalQuantity', '$cancelledQuantity'] }, 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        '$deliveredQuantity',
                        { $subtract: ['$totalQuantity', '$cancelledQuantity'] }
                      ]
                    },
                    100
                  ]
                },
                0
              ]
            },
            cancellationRate: {
              $cond: [
                { $gt: ['$totalQuantity', 0] },
                { $multiply: [{ $divide: ['$cancelledQuantity', '$totalQuantity'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { deliveredRevenue: -1 } },
        { $limit: limit }
      ];

      const products = await Order.aggregate(pipeline);

      return {
        products: products.map(product => ({
          ...product,
          fulfillmentRate: Math.round(product.fulfillmentRate * 100) / 100,
          cancellationRate: Math.round(product.cancellationRate * 100) / 100,
          avgOrderValue: product.totalOrders > 0 ? product.totalRevenue / product.totalOrders : 0
        })),
        summary: {
          totalProducts: products.length,
          avgFulfillmentRate: products.length > 0 ? 
            products.reduce((sum, p) => sum + p.fulfillmentRate, 0) / products.length : 0,
          avgCancellationRate: products.length > 0 ? 
            products.reduce((sum, p) => sum + p.cancellationRate, 0) / products.length : 0
        }
      };

    } catch (error) {
      console.error('Product performance report error:', error);
      throw new Error(`Failed to generate product performance report: ${error.message}`);
    }
  }

  /**
   * Export mixed order data to CSV format
   * @param {Object} filters - Export filters
   * @returns {String} CSV data
   */
  static async exportMixedOrderCSV(filters = {}) {
    try {
      const report = await this.generateMixedOrderReport({ ...filters, includeItems: true });
      
      const csvHeaders = [
        'Order ID',
        'Customer Name',
        'Customer Email',
        'Order Date',
        'Order Status',
        'Total Items',
        'Delivered Items',
        'Cancelled Items',
        'Active Items',
        'Total Revenue',
        'Delivered Revenue',
        'Cancelled Revenue',
        'Active Revenue',
        'Fulfillment Rate',
        'Is Mixed Status',
        'Payment Method',
        'Payment Status'
      ];

      const csvRows = [csvHeaders.join(',')];

      report.orders.forEach(order => {
        const row = [
          `"${order._id}"`,
          `"${order.user?.fullname || 'N/A'}"`,
          `"${order.user?.email || 'N/A'}"`,
          `"${new Date(order.createdAt).toISOString().split('T')[0]}"`,
          `"${order.status}"`,
          order.analysis.totalItems,
          order.analysis.deliveredItems,
          order.analysis.cancelledItems,
          order.analysis.activeItems,
          order.totalPrice,
          order.analysis.deliveredRevenue,
          order.analysis.cancelledRevenue,
          order.analysis.activeRevenue,
          `${order.analysis.fulfillmentRate.toFixed(2)}%`,
          order.analysis.isMixed ? 'Yes' : 'No',
          `"${order.paymentMethod}"`,
          order.paid ? 'Paid' : 'Unpaid'
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');

    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  }
}

module.exports = MixedOrderReportingService;