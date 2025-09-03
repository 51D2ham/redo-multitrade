const { Order } = require('../models/orderModel');
const { Product } = require('../models/productModel');
const User = require('../models/userRegisterModel');
const { Category, Brand } = require('../models/parametersModel');
const Sale = require('../models/saleModel');
const InventoryLog = require('../models/inventoryLogModel');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>\"'&\r\n\t]/g, '').trim();
};

// Validate date helper
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Get date range helper
const getDateRange = (period) => {
  const now = moment().tz('Asia/Kathmandu');
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = now.clone().startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'yesterday':
      startDate = now.clone().subtract(1, 'day').startOf('day');
      endDate = now.clone().subtract(1, 'day').endOf('day');
      break;
    case 'week':
      startDate = now.clone().startOf('week');
      endDate = now.clone().endOf('week');
      break;
    case 'month':
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
      break;
    case 'quarter':
      startDate = now.clone().startOf('quarter');
      endDate = now.clone().endOf('quarter');
      break;
    case 'year':
      startDate = now.clone().startOf('year');
      endDate = now.clone().endOf('year');
      break;
    case 'last7days':
      startDate = now.clone().subtract(7, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'last30days':
      startDate = now.clone().subtract(30, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    case 'last90days':
      startDate = now.clone().subtract(90, 'days').startOf('day');
      endDate = now.clone().endOf('day');
      break;
    default:
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
  }

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  };
};

// Comprehensive Dashboard Report
exports.getComprehensiveReport = async (req, res) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    
    let dateRange;
    if (customStart && customEnd && isValidDate(customStart) && isValidDate(customEnd)) {
      dateRange = {
        startDate: new Date(customStart),
        endDate: new Date(customEnd)
      };
    } else {
      dateRange = getDateRange(period);
    }

    // Get inventory data first with error handling
    let inventoryData;
    try {
      const InventoryService = require('../services/inventoryService');
      inventoryData = await InventoryService.getDashboardData();
    } catch (error) {
      console.error('Inventory service error:', error);
      inventoryData = { recentMovements: [] };
    }
    
    // Parallel data fetching with individual error handling
    const [
      orderStats,
      revenueStats,
      productStats,
      customerStats,
      topProducts,
      topCategories,
      topBrands,
      topSubCategories,
      topTypes,
      recentOrders,
      inventoryAlerts,
      salesTrend,
      orderStatusAnalytics,
      recentInventoryMovements
    ] = await Promise.allSettled([
      getOrderStatistics(dateRange),
      getRevenueStatistics(dateRange),
      getProductStatistics(dateRange),
      getCustomerStatistics(dateRange),
      getTopProducts(dateRange, 10),
      getTopCategories(dateRange, 10),
      getTopBrands(dateRange, 10),
      getTopSubCategories(dateRange, 10),
      getTopTypes(dateRange, 10),
      getRecentOrders(10),
      getInventoryAlerts(),
      getSalesTrend(dateRange),
      getOrderStatusAnalytics(dateRange),
      getRecentInventoryMovements(10)
    ]);
    
    // Extract values with fallbacks
    const safeExtract = (result, fallback = {}) => 
      result.status === 'fulfilled' ? result.value : fallback;
    
    const finalInventoryMovements = safeExtract(recentInventoryMovements, []).length > 0 
      ? safeExtract(recentInventoryMovements, []) 
      : inventoryData.recentMovements || [];

    const extractedOrderStats = safeExtract(orderStats, {});
    const extractedRevenueStats = safeExtract(revenueStats, {});
    
    // Ensure revenue consistency between orderStats and revenueStats
    const finalRevenue = extractedOrderStats.totalRevenue || extractedRevenueStats.totalRevenue || 0;
    
    res.render('reports/optimizedDashboard', {
      title: 'Business Dashboard',
      period,
      dateRange,
      orderStats: { ...extractedOrderStats, totalRevenue: finalRevenue },
      revenueStats: { ...extractedRevenueStats, totalRevenue: finalRevenue },
      productStats: safeExtract(productStats, {}),
      customerStats: safeExtract(customerStats, {}),
      topProducts: safeExtract(topProducts, []),
      topCategories: safeExtract(topCategories, []),
      topBrands: safeExtract(topBrands, []),
      topSubCategories: safeExtract(topSubCategories, []),
      topTypes: safeExtract(topTypes, []),
      recentOrders: safeExtract(recentOrders, []),
      inventoryAlerts: safeExtract(inventoryAlerts, {}),
      salesTrend: safeExtract(salesTrend, []),
      orderStatusAnalytics: safeExtract(orderStatusAnalytics, {}),
      recentInventoryMovements: finalInventoryMovements,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (error) {
    console.error('Comprehensive report error:', error);
    res.render('reports/optimizedDashboard', {
      title: 'Business Dashboard',
      period: 'today',
      dateRange: getDateRange('today'),
      orderStats: {},
      revenueStats: {},
      productStats: {},
      customerStats: {},
      topProducts: [],
      topCategories: [],
      topBrands: [],
      topSubCategories: [],
      topTypes: [],
      recentOrders: [],
      inventoryAlerts: {},
      salesTrend: [],
      orderStatusAnalytics: {},
      recentInventoryMovements: [],
      success: [],
      error: ['Dashboard temporarily unavailable. Please try again.']
    });
  }
};

// Order Statistics with Mixed Status Handling
const getOrderStatistics = async (dateRange) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $addFields: {
          // Calculate delivered value per order
          deliveredValue: {
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
          // Calculate active (non-cancelled) value per order
          activeValue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$items',
                    cond: { $ne: ['$$this.status', 'cancelled'] }
                  }
                },
                as: 'item',
                in: '$$item.totalPrice'
              }
            }
          },
          hasDeliveredItems: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$items',
                    cond: { $eq: ['$$this.status', 'delivered'] }
                  }
                }
              },
              0
            ]
          },
          hasActiveItems: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$items',
                    cond: { $ne: ['$$this.status', 'cancelled'] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          // Revenue from delivered items only
          totalRevenue: { $sum: '$deliveredValue' },
          // Revenue from all active (non-cancelled) items
          activeRevenue: { $sum: '$activeValue' },
          // Orders with delivered items for average calculation
          ordersWithDeliveries: {
            $sum: { $cond: ['$hasDeliveredItems', 1, 0] }
          },
          // Orders with active items
          ordersWithActiveItems: {
            $sum: { $cond: ['$hasActiveItems', 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          pendingRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$activeValue', 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          processingRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, '$activeValue', 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
          },
          shippedRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, '$activeValue', 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          deliveredRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$deliveredValue', 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          cancelledRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$totalPrice', 0] }
          },
          // Only count paid orders with active items
          paidOrders: {
            $sum: { 
              $cond: [
                { $and: ['$paid', '$hasActiveItems'] }, 
                1, 0
              ] 
            }
          },
          // Only count payment methods from orders with active items
          codOrders: {
            $sum: { 
              $cond: [
                { $and: [{ $eq: ['$paymentMethod', 'cod'] }, '$hasActiveItems'] }, 
                1, 0
              ] 
            }
          },
          onlineOrders: {
            $sum: { 
              $cond: [
                { $and: [{ $ne: ['$paymentMethod', 'cod'] }, '$hasActiveItems'] }, 
                1, 0
              ] 
            }
          }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const stats = result[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      activeRevenue: 0,
      ordersWithDeliveries: 0,
      ordersWithActiveItems: 0,
      pendingOrders: 0,
      pendingRevenue: 0,
      processingOrders: 0,
      processingRevenue: 0,
      shippedOrders: 0,
      shippedRevenue: 0,
      deliveredOrders: 0,
      deliveredRevenue: 0,
      cancelledOrders: 0,
      cancelledRevenue: 0,
      paidOrders: 0,
      codOrders: 0,
      onlineOrders: 0
    };

    // Calculate average order value from delivered items only
    const avgOrderValue = stats.ordersWithDeliveries > 0 ? 
      stats.totalRevenue / stats.ordersWithDeliveries : 0;

    // Calculate fulfillment rate (orders with deliveries vs orders with active items)
    const fulfillmentRate = stats.ordersWithActiveItems > 0 ? 
      Math.round((stats.ordersWithDeliveries / stats.ordersWithActiveItems) * 100) : 0;

    // Calculate payment completion rate (paid vs orders with active items)
    const paymentRate = stats.ordersWithActiveItems > 0 ? 
      Math.round((stats.paidOrders / stats.ordersWithActiveItems) * 100) : 0;

    return {
      ...stats,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      fulfillmentRate,
      paymentRate,
      nonCancelledOrders: stats.ordersWithActiveItems,
      // Additional metrics for mixed status handling
      partiallyFulfilledOrders: Math.max(0, stats.ordersWithActiveItems - stats.deliveredOrders),
      revenueFromDelivered: stats.totalRevenue,
      potentialRevenue: stats.activeRevenue,
      // Ensure totalRevenue matches delivered revenue for accuracy
      actualTotalRevenue: stats.totalRevenue
    };

  } catch (error) {
    console.error('Order statistics error:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      fulfillmentRate: 0,
      paymentRate: 0,
      nonCancelledOrders: 0
    };
  }
};

// Revenue Statistics with Mixed Status Handling
const getRevenueStatistics = async (dateRange) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $addFields: {
          // Calculate delivered value per order
          deliveredValue: {
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
          hasDeliveredItems: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$items',
                    cond: { $eq: ['$$this.status', 'delivered'] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $match: {
          hasDeliveredItems: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          dailyRevenue: { $sum: '$deliveredValue' },
          dailyOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const dailyData = await Order.aggregate(pipeline);
    
    // Calculate growth compared to previous period
    const periodLength = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(dateRange.startDate.getTime() - (periodLength * 24 * 60 * 60 * 1000));
    const previousEnd = new Date(dateRange.startDate.getTime() - 1);

    const [currentRevenue, previousRevenue] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $addFields: {
            deliveredValue: {
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
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$deliveredValue' } } }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStart, $lte: previousEnd }
          }
        },
        {
          $addFields: {
            deliveredValue: {
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
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$deliveredValue' } } }
      ])
    ]);

    const current = currentRevenue[0]?.total || 0;
    const previous = previousRevenue[0]?.total || 0;
    const growthRate = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    return {
      dailyData,
      totalRevenue: current,
      growthRate,
      avgDailyRevenue: dailyData.length > 0 ? 
        Math.round((current / dailyData.length) * 100) / 100 : 0
    };

  } catch (error) {
    console.error('Revenue statistics error:', error);
    return {
      dailyData: [],
      totalRevenue: 0,
      growthRate: 0,
      avgDailyRevenue: 0
    };
  }
};

// Product Statistics
const getProductStatistics = async (dateRange) => {
  try {
    const [totalProducts, activeProducts, lowStockProducts, outOfStockProducts, stockValue] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ 
        status: 'active',
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$variants',
                  cond: { 
                    $and: [
                      { $gt: ['$$this.stock', 0] },
                      { $lte: ['$$this.stock', '$$this.lowStockAlert'] }
                    ]
                  }
                }
              }
            },
            0
          ]
        }
      }),
      Product.countDocuments({ 
        status: 'active',
        totalStock: 0
      }),
      Product.aggregate([
        { $match: { status: 'active' } },
        { $unwind: '$variants' },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: [
                  '$variants.stock',
                  '$variants.price'
                ]
              }
            }
          }
        }
      ]).then(result => result[0]?.totalValue || 0)
    ]);

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      inStockProducts: activeProducts - outOfStockProducts,
      stockValue: Math.round(stockValue)
    };

  } catch (error) {
    console.error('Product statistics error:', error);
    return {
      totalProducts: 0,
      activeProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      inStockProducts: 0,
      stockValue: 0
    };
  }
};

// Customer Statistics
const getCustomerStatistics = async (dateRange) => {
  try {
    const [totalCustomers, newCustomers, activeCustomers] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({
        status: 'active',
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      User.aggregate([
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'user',
            as: 'orders'
          }
        },
        {
          $match: {
            'orders.createdAt': { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        { $count: 'activeCustomers' }
      ])
    ]);

    return {
      totalCustomers,
      newCustomers,
      activeCustomers: activeCustomers[0]?.activeCustomers || 0
    };

  } catch (error) {
    console.error('Customer statistics error:', error);
    return {
      totalCustomers: 0,
      newCustomers: 0,
      activeCustomers: 0
    };
  }
};

// Top Products with Mixed Status Handling
const getTopProducts = async (dateRange, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productTitle: '$product.title',
          totalSold: 1,
          totalRevenue: 1,
          orderCount: 1,
          avgPrice: { $divide: ['$totalRevenue', '$totalSold'] }
        }
      }
    ];

    return await Order.aggregate(pipeline);

  } catch (error) {
    console.error('Top products error:', error);
    return [];
  }
};

// Top Categories with Mixed Status Handling
const getTopCategories = async (dateRange, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    return await Order.aggregate(pipeline);

  } catch (error) {
    console.error('Top categories error:', error);
    return [];
  }
};

// Recent Orders
const getRecentOrders = async (limit = 10) => {
  try {
    return await Order.find()
      .populate('user', 'fullname email')
      .select('_id totalPrice status createdAt user items')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

  } catch (error) {
    console.error('Recent orders error:', error);
    return [];
  }
};

// Inventory Alerts
const getInventoryAlerts = async () => {
  try {
    const [lowStockProducts, outOfStockProducts] = await Promise.all([
      Product.find({
        status: 'active',
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$variants',
                  cond: { 
                    $and: [
                      { $gt: ['$$this.stock', 0] },
                      { $lte: ['$$this.stock', '$$this.lowStockAlert'] }
                    ]
                  }
                }
              }
            },
            0
          ]
        }
      })
      .select('title variants')
      .limit(20),
      
      Product.find({
        status: 'active',
        totalStock: 0
      })
      .select('title variants')
      .limit(20)
    ]);

    return {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts
    };

  } catch (error) {
    console.error('Inventory alerts error:', error);
    return {
      lowStock: [],
      outOfStock: []
    };
  }
};

// Sales Trend with Mixed Status Handling
const getSalesTrend = async (dateRange) => {
  try {
    // Generate all dates in range to show zero values for days with no sales
    const dates = [];
    const currentDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $addFields: {
          deliveredValue: {
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
          deliveredItems: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$items',
                    cond: { $eq: ['$$this.status', 'delivered'] }
                  }
                },
                as: 'item',
                in: '$$item.qty'
              }
            }
          },
          hasDeliveredItems: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$items',
                    cond: { $eq: ['$$this.status', 'delivered'] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $match: {
          hasDeliveredItems: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$deliveredValue' },
          items: { $sum: '$deliveredItems' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const salesData = await Order.aggregate(pipeline);
    const salesMap = {};
    salesData.forEach(item => {
      salesMap[item._id] = item;
    });

    // Fill in missing dates with zero values
    const completeTrend = dates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      return salesMap[dateStr] || {
        _id: dateStr,
        orders: 0,
        revenue: 0,
        items: 0
      };
    });

    return completeTrend;

  } catch (error) {
    console.error('Sales trend error:', error);
    return [];
  }
};

// Export Reports to Excel
exports.exportReports = async (req, res) => {
  try {
    const { type = 'orders', period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    
    let dateRange;
    if (customStart && customEnd && isValidDate(customStart) && isValidDate(customEnd)) {
      dateRange = {
        startDate: new Date(customStart),
        endDate: new Date(customEnd)
      };
    } else {
      dateRange = getDateRange(period);
    }

    const workbook = new ExcelJS.Workbook();
    
    switch (type) {
      case 'orders':
        await generateOrdersReport(workbook, dateRange);
        break;
      case 'products':
        await generateProductsReport(workbook, dateRange);
        break;
      case 'customers':
        await generateCustomersReport(workbook, dateRange);
        break;
      case 'inventory':
        await generateInventoryReport(workbook);
        break;
      default:
        await generateComprehensiveReport(workbook, dateRange);
    }

    const filename = `${type}_report_${moment().format('YYYY-MM-DD')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export reports error:', sanitizeInput(error.message));
    req.flash('error', 'Failed to export report');
    res.redirect('/admin/reports/comprehensive');
  }
};

// Generate Orders Report
const generateOrdersReport = async (workbook, dateRange) => {
  const worksheet = workbook.addWorksheet('Orders Report');
  
  // Headers
  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 15 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Items', key: 'items', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Paid', key: 'paid', width: 10 },
    { header: 'Order Date', key: 'orderDate', width: 15 }
  ];

  // Data
  const orders = await Order.find({
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
  })
  .populate('user', 'fullname email')
  .sort({ createdAt: -1 })
  .lean();

  orders.forEach(order => {
    worksheet.addRow({
      orderId: order._id.toString().slice(-8).toUpperCase(),
      customer: order.user?.fullname || 'Guest',
      email: order.user?.email || 'N/A',
      totalAmount: order.totalPrice,
      items: order.totalItem,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paid: order.paid ? 'Yes' : 'No',
      orderDate: moment(order.createdAt).format('YYYY-MM-DD HH:mm')
    });
  });

  // Styling
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' }
  };
};

// Generate Products Report
const generateProductsReport = async (workbook, dateRange) => {
  const worksheet = workbook.addWorksheet('Products Report');
  
  worksheet.columns = [
    { header: 'Product Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Brand', key: 'brand', width: 15 },
    { header: 'Total Stock', key: 'totalStock', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Units Sold', key: 'unitsSold', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 15 },
    { header: 'Created Date', key: 'createdDate', width: 15 }
  ];

  const products = await Product.find()
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Get sales data for each product
  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        unitsSold: { $sum: '$items.qty' },
        revenue: { $sum: '$items.totalPrice' }
      }
    }
  ]);

  const salesMap = {};
  salesData.forEach(sale => {
    salesMap[sale._id.toString()] = {
      unitsSold: sale.unitsSold,
      revenue: sale.revenue
    };
  });

  products.forEach(product => {
    const sales = salesMap[product._id.toString()] || { unitsSold: 0, revenue: 0 };
    
    worksheet.addRow({
      title: product.title,
      category: product.category?.name || 'N/A',
      brand: product.brand?.name || 'N/A',
      totalStock: product.totalStock,
      status: product.status,
      unitsSold: sales.unitsSold,
      revenue: sales.revenue,
      createdDate: moment(product.createdAt).format('YYYY-MM-DD')
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' }
  };
};

// Top Brands with Mixed Status Handling
const getTopBrands = async (dateRange, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'brands',
          localField: 'product.brand',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: '$brand' },
      {
        $group: {
          _id: '$brand._id',
          brandName: { $first: '$brand.name' },
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    return await Order.aggregate(pipeline);

  } catch (error) {
    console.error('Top brands error:', error);
    return [];
  }
};

// Top SubCategories with Mixed Status Handling
const getTopSubCategories = async (dateRange, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'subcategories',
          localField: 'product.subCategory',
          foreignField: '_id',
          as: 'subCategory'
        }
      },
      { $unwind: '$subCategory' },
      {
        $group: {
          _id: '$subCategory._id',
          subCategoryName: { $first: '$subCategory.name' },
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    return await Order.aggregate(pipeline);

  } catch (error) {
    console.error('Top subcategories error:', error);
    return [];
  }
};

// Top Types with Mixed Status Handling
const getTopTypes = async (dateRange, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'delivered'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'types',
          localField: 'product.type',
          foreignField: '_id',
          as: 'type'
        }
      },
      { $unwind: '$type' },
      {
        $group: {
          _id: '$type._id',
          typeName: { $first: '$type.name' },
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    return await Order.aggregate(pipeline);

  } catch (error) {
    console.error('Top types error:', error);
    return [];
  }
};

// Order Status Analytics with Revenue
const getOrderStatusAnalytics = async (dateRange) => {
  try {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          avgOrderValue: { $avg: '$totalPrice' }
        }
      },
      { $sort: { count: -1 } }
    ];

    const result = await Order.aggregate(pipeline);
    
    // Format for easy template access
    const statusMap = {};
    result.forEach(item => {
      statusMap[item._id] = {
        count: item.count,
        revenue: item.totalRevenue,
        avgValue: Math.round(item.avgOrderValue * 100) / 100
      };
    });

    return {
      pending: statusMap.pending || { count: 0, revenue: 0, avgValue: 0 },
      processing: statusMap.processing || { count: 0, revenue: 0, avgValue: 0 },
      shipped: statusMap.shipped || { count: 0, revenue: 0, avgValue: 0 },
      delivered: statusMap.delivered || { count: 0, revenue: 0, avgValue: 0 },
      cancelled: statusMap.cancelled || { count: 0, revenue: 0, avgValue: 0 },
      raw: result
    };

  } catch (error) {
    console.error('Order status analytics error:', error);
    return {
      pending: { count: 0, revenue: 0, avgValue: 0 },
      processing: { count: 0, revenue: 0, avgValue: 0 },
      shipped: { count: 0, revenue: 0, avgValue: 0 },
      delivered: { count: 0, revenue: 0, avgValue: 0 },
      cancelled: { count: 0, revenue: 0, avgValue: 0 },
      raw: []
    };
  }
};

// Recent Inventory Movements
const getRecentInventoryMovements = async (limit = 10) => {
  try {
    const InventoryLog = require('../models/inventoryLogModel');
    
    const movements = await InventoryLog.find({})
      .populate('product', 'title thumbnail')
      .populate('admin', 'fullname')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return movements.map(movement => ({
      _id: movement._id,
      productTitle: movement.product?.title || 'Unknown Product',
      productImage: movement.product?.thumbnail,
      variantSku: movement.variantSku || 'N/A',
      type: movement.type || 'unknown',
      quantity: movement.quantity || 0,
      previousStock: movement.previousStock || 0,
      newStock: movement.newStock || 0,
      createdAt: movement.createdAt,
      orderId: movement.orderId,
      admin: movement.admin,
      notes: movement.notes || movement.reason
    }));
    
  } catch (error) {
    console.error('Recent inventory movements error:', error);
    return [];
  }
};

module.exports = exports;