const { Order } = require('../models/orderModel');
const Sale = require('../models/saleModel');

class MixedOrderReportingService {
  // Get comprehensive order analytics for mixed status orders
  static async getOrderAnalytics(filters = {}) {
    const { startDate, endDate, year } = filters;
    const currentYear = year || new Date().getFullYear();
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      dateFilter = {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`)
        }
      };
    }

    // Comprehensive order analysis
    const orderAnalysis = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            orderId: '$_id',
            orderStatus: '$status',
            paymentMethod: '$paymentMethod',
            paid: '$paid'
          },
          totalOrderValue: { $first: '$totalPrice' },
          deliveredItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'delivered'] }, 1, 0]
            }
          },
          cancelledItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'cancelled'] }, 1, 0]
            }
          },
          pendingItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'pending'] }, 1, 0]
            }
          },
          processingItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'processing'] }, 1, 0]
            }
          },
          shippedItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'shipped'] }, 1, 0]
            }
          },
          deliveredValue: {
            $sum: {
              $cond: [
                { $eq: ['$items.status', 'delivered'] },
                '$items.totalPrice',
                0
              ]
            }
          },
          cancelledValue: {
            $sum: {
              $cond: [
                { $eq: ['$items.status', 'cancelled'] },
                '$items.totalPrice',
                0
              ]
            }
          },
          totalItems: { $sum: 1 }
        }
      },
      {
        $addFields: {
          orderType: {
            $cond: [
              { $eq: ['$deliveredItems', '$totalItems'] }, 'fully_delivered',
              {
                $cond: [
                  { $eq: ['$cancelledItems', '$totalItems'] }, 'fully_cancelled',
                  {
                    $cond: [
                      { $and: [{ $gt: ['$deliveredItems', 0] }, { $gt: ['$cancelledItems', 0] }] },
                      'mixed_delivered_cancelled',
                      {
                        $cond: [
                          { $gt: ['$deliveredItems', 0] }, 'partially_delivered',
                          'pending_processing'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          fulfillmentRate: {
            $cond: [
              { $eq: ['$totalItems', 0] }, 0,
              { $divide: ['$deliveredItems', '$totalItems'] }
            ]
          }
        }
      }
    ]);

    // Summary statistics
    const summary = orderAnalysis.reduce((acc, order) => {
      acc.totalOrders++;
      acc.totalOrderValue += order.totalOrderValue;
      acc.totalDeliveredValue += order.deliveredValue;
      acc.totalCancelledValue += order.cancelledValue;
      acc.totalDeliveredItems += order.deliveredItems;
      acc.totalCancelledItems += order.cancelledItems;
      
      // Order type counts
      acc.orderTypes[order.orderType] = (acc.orderTypes[order.orderType] || 0) + 1;
      
      // Revenue-generating orders (have delivered items)
      if (order.deliveredItems > 0) {
        acc.revenueGeneratingOrders++;
      }
      
      return acc;
    }, {
      totalOrders: 0,
      totalOrderValue: 0,
      totalDeliveredValue: 0,
      totalCancelledValue: 0,
      totalDeliveredItems: 0,
      totalCancelledItems: 0,
      revenueGeneratingOrders: 0,
      orderTypes: {}
    });

    return {
      summary,
      orderAnalysis,
      metrics: {
        averageOrderValue: summary.totalOrders > 0 ? summary.totalOrderValue / summary.totalOrders : 0,
        averageDeliveredValue: summary.revenueGeneratingOrders > 0 ? summary.totalDeliveredValue / summary.revenueGeneratingOrders : 0,
        fulfillmentRate: summary.totalOrders > 0 ? (summary.orderTypes.fully_delivered || 0) / summary.totalOrders : 0,
        cancellationRate: summary.totalOrders > 0 ? (summary.orderTypes.fully_cancelled || 0) / summary.totalOrders : 0,
        mixedOrderRate: summary.totalOrders > 0 ? (summary.orderTypes.mixed_delivered_cancelled || 0) / summary.totalOrders : 0,
        revenueEfficiency: summary.totalOrderValue > 0 ? summary.totalDeliveredValue / summary.totalOrderValue : 0
      }
    };
  }

  // Get monthly trend for mixed orders
  static async getMonthlyMixedOrderTrend(year) {
    const currentYear = year || new Date().getFullYear();
    
    const monthlyData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            orderId: '$_id'
          },
          deliveredValue: {
            $sum: {
              $cond: [
                { $eq: ['$items.status', 'delivered'] },
                '$items.totalPrice',
                0
              ]
            }
          },
          cancelledValue: {
            $sum: {
              $cond: [
                { $eq: ['$items.status', 'cancelled'] },
                '$items.totalPrice',
                0
              ]
            }
          },
          totalValue: { $first: '$totalPrice' }
        }
      },
      {
        $group: {
          _id: '$_id.month',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$deliveredValue' },
          totalCancelled: { $sum: '$cancelledValue' },
          totalOrderValue: { $sum: '$totalValue' },
          ordersWithDeliveries: {
            $sum: {
              $cond: [{ $gt: ['$deliveredValue', 0] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Create complete 12-month array
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const existing = monthlyData.find(m => m._id === monthNum);
      return {
        month: monthNum,
        totalOrders: existing ? existing.totalOrders : 0,
        totalRevenue: existing ? existing.totalRevenue : 0,
        totalCancelled: existing ? existing.totalCancelled : 0,
        totalOrderValue: existing ? existing.totalOrderValue : 0,
        ordersWithDeliveries: existing ? existing.ordersWithDeliveries : 0,
        revenueEfficiency: existing && existing.totalOrderValue > 0 
          ? existing.totalRevenue / existing.totalOrderValue 
          : 0
      };
    });

    return monthlyTrend;
  }

  // Get order status breakdown
  static async getOrderStatusBreakdown(filters = {}) {
    const { startDate, endDate, year } = filters;
    const currentYear = year || new Date().getFullYear();
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      dateFilter = {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`)
        }
      };
    }

    const statusBreakdown = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            orderStatus: '$status',
            itemStatus: '$items.status'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $group: {
          _id: '$_id.orderStatus',
          itemBreakdown: {
            $push: {
              itemStatus: '$_id.itemStatus',
              count: '$count',
              totalValue: '$totalValue'
            }
          },
          totalItems: { $sum: '$count' },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);

    return statusBreakdown;
  }
}

module.exports = MixedOrderReportingService;