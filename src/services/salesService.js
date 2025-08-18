const Order = require('../models/orderModel');
const Product = require('../models/productModel').Product;
const InventoryLog = require('../models/inventoryLogModel');
const Sale = require('../models/saleModel');
const PriceLog = require('../models/priceLogModel');

const DEFAULT_SALE_STATUSES = ['Completed', 'Confirmed', 'Delivered', 'Shipped'];
const DEFAULT_REPORT_LIMIT = 10;

//validate date range
function parseDateRange({ startDate, endDate }) {
  let start, end;
  try {
    start = startDate ? new Date(startDate) : new Date('1970-01-01');
    end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start.getTime())) start = new Date('1970-01-01');
    if (isNaN(end.getTime())) end = new Date();
    end.setHours(23, 59, 59, 999);
  } catch {
    start = new Date('1970-01-01');
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

module.exports = {
  // getRevenueSummary:
  //Total revenue = sum of all `Sale.totalLinePrice` between start/end.
  //Total number of orders (distinct) = count distinct orderId’s in that range.

  async getRevenueSummary({ startDate, endDate, onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const { start, end } = parseDateRange({ startDate, endDate });
    const result = await Sale.aggregate([
      // 1) date filter
      { $match: { soldAt: { $gte: start, $lte: end } } },

      // 2) join to order to check its status
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },

      // 3) only include the statuses you want (e.g. exclude Cancelled)
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },

      // 4) group & project
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$totalLinePrice', 0] } },
          ordersSet: { $addToSet: '$orderId' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalOrders: { $size: '$ordersSet' }
        }
      }
    ]);
    // Always return a valid object
    return result && result[0] ? result[0] : { totalRevenue: 0, totalOrders: 0 };
  },


   // 2) getAverageOrderValue:
  // For each distinct order in that date range, sum its line items → orderValue.
  // averageOrderValue = avg(orderValue), orderCount = number of orders.
   
  async getAverageOrderValue({ startDate, endDate, onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const { start, end } = parseDateRange({ startDate, endDate });

    const result = await Sale.aggregate([
      {
        $match: {
          soldAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },
      {
        $group: {
          // Group by orderId to compute each order’s total
          _id: '$orderId',
          orderValue: { $sum: { $ifNull: ['$totalLinePrice', 0] } }
        }
      },
      {
        $group: {
          _id: null,
          averageOrderValue: { $avg: '$orderValue' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          averageOrderValue: 1,
          orderCount: 1
        }
      }
    ]);

    return result && result[0] ? result[0] : { averageOrderValue: 0, orderCount: 0 };
  },

  
      // 3) getTopSellingProducts:
      // By quantity and by revenue, ranked descending.
      // limit: number of top results to return (default 10).
   
  async getTopSellingProducts({ startDate, endDate, limit = 10, onlyStatuses = DEFAULT_SALE_STATUSES, sortBy = 'quantity' }) {
    const { start, end } = parseDateRange({ startDate, endDate });

    const topProducts = await Sale.aggregate([
      {
        $match: {
          soldAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },
      {
        $group: {
          _id: '$product',
          totalQuantity: { $sum: { $ifNull: ['$quantity', 0] } },
          totalRevenue: { $sum: { $ifNull: ['$totalLinePrice', 0] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: { $ifNull: ['$productInfo.title', 'Unknown'] },
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      // We'll sort after aggregation to allow dynamic sortBy (quantity or revenue)
    ]);

    const normalized = Array.isArray(topProducts) ? topProducts : [];
    // sort dynamically by requested metric
    const sorted = normalized.sort((a, b) => {
      if (sortBy === 'revenue') {
        return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      }
      // default: sort by quantity
      return (b.totalQuantity || 0) - (a.totalQuantity || 0);
    });

    return sorted.slice(0, limit);
  },


   // 4) getSalesByCategory:
   // For each sale in the date range, lookup product → category → group by category.

  async getSalesByCategory({ startDate, endDate, onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const { start, end } = parseDateRange({ startDate, endDate });

    const salesByCat = await Sale.aggregate([
      {
        $match: {
          soldAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'prod'
        }
      },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'prod.category',
          foreignField: '_id',
          as: 'cat'
        }
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$cat._id',
          categoryName: { $first: { $ifNull: ['$cat.name', 'Uncategorized'] } },
          totalRevenue: { $sum: { $ifNull: ['$totalLinePrice', 0] } },
          totalQuantity: { $sum: { $ifNull: ['$quantity', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          totalRevenue: 1,
          totalQuantity: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return Array.isArray(salesByCat) ? salesByCat : [];
  },

  
   //5) getLowStockAlerts:
   // Finds all product variants whose stock ≤ threshold.
   // Returns [ { productId, title, sku, stock }, … ] sorted ascending by stock.
   
  async getLowStockAlerts({ threshold = 5 }) {
    const products = await Product.aggregate([
      { $unwind: '$variants' },
      { $match: { 'variants.stock': { $lte: threshold } } },
      { $project: {
        productId: '$_id',
        title: 1,
        sku: '$variants.sku',
        stock: { $ifNull: ['$variants.stock', 0] }
      } },
      { $sort: { stock: 1, title: 1 } }
    ]);

    return Array.isArray(products) ? products : [];
  },

  
   // 6) getMonthlySalesTrend:
   // For a given year, returns an array of 12 entries:
    //     [ { month: 1, totalRevenue, totalOrders }, … { month: 12, … } ].
    // Ensures months with zero sales appear as zero.
   
  async getMonthlySalesTrend({ year = new Date().getFullYear(), onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const trend = await Sale.aggregate([
      {
        $match: {
          soldAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },
      {
        $addFields: {
          month: { $month: '$soldAt' }
        }
      },
      {
        $group: {
          _id: '$month',
          totalRevenue: { $sum: { $ifNull: ['$totalLinePrice', 0] } },
          totalOrders: { $addToSet: '$orderId' } // will turn into array of orderIds
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          totalRevenue: 1,
          totalOrders: { $size: '$totalOrders' }
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    // Fill in months with zero values if missing
    const fullTrend = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = Array.isArray(trend) ? trend.find((t) => t.month === m) : null;
      return {
        month: m,
        totalRevenue: found ? found.totalRevenue : 0,
        totalOrders: found ? found.totalOrders : 0
      };
    });

    return fullTrend;
  },

  
   // 7) getInventoryLogSummary:
      //  - Groups inventory changes by reason & month.
      //  - Returns an object keyed by reason, each with an array of monthly { month, totalChange, count }.
   
  async getInventoryLogSummary({ startDate, endDate }) {
    const { start, end } = parseDateRange({ startDate, endDate });

    const logs = await InventoryLog.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: false } }, // force only logs with valid product
      {
        $project: {
          reason: 1,
          month: { $month: '$timestamp' },
          change: 1,
          variantSku: 1,
          productName: { $ifNull: ['$productInfo.title', '$productInfo.name'] }
        }
      },
      {
        $group: {
          _id: { reason: '$reason', month: '$month', productName: '$productName', variantSku: '$variantSku' },
          totalChange: { $sum: { $ifNull: ['$change', 0] } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          reason: '$_id.reason',
          month: '$_id.month',
          productName: '$_id.productName',
          variantSku: '$_id.variantSku',
          totalChange: 1,
          count: 1
        }
      },
      { $sort: { reason: 1, month: 1, productName: 1 } }
    ]);

    // Group by reason, then by month, then by product
    const summary = {};
    if (Array.isArray(logs)) {
      logs.forEach((d) => {
        if (!summary[d.reason]) summary[d.reason] = {};
        if (!summary[d.reason][d.month]) summary[d.reason][d.month] = [];
        summary[d.reason][d.month].push({
          productName: d.productName,
          variantSku: d.variantSku,
          totalChange: d.totalChange,
          count: d.count
        });
      });
    }
    return summary;
  },

  
   // 8) getPriceChangeEvents:
    // Returns all price change events (from PriceLog) between start/end,
    // grouped by variantSku.
    // Each entry: { variantSku, events: [ { changedAt, oldPrice, newPrice }, … ] }.
  
  async getPriceChangeEvents({ startDate, endDate }) {
    const { start, end } = parseDateRange({ startDate, endDate });

    // Step 1: fetch all logs in range
    const logs = await PriceLog.aggregate([
      {
        $match: {
          changedAt: { $gte: start, $lte: end }
        }
      },
      {
        $sort: { changedAt: 1 }
      },
      {
        $project: {
          _id: 0,
          variantSku: 1,
          oldPrice: { $ifNull: ['$oldPrice', 0] },
          newPrice: { $ifNull: ['$newPrice', 0] },
          changedAt: 1
        }
      }
    ]);

    // Step 2: group them by variantSku
    const grouped = {};
    if (Array.isArray(logs)) {
      logs.forEach((evt) => {
        if (!grouped[evt.variantSku]) grouped[evt.variantSku] = [];
        grouped[evt.variantSku].push({
          changedAt: evt.changedAt,
          oldPrice: evt.oldPrice,
          newPrice: evt.newPrice
        });
      });
    }

    // Format as array of { variantSku, events: [ … ] }
    return Object.entries(grouped).map(([variantSku, events]) => ({
      variantSku,
      events
    }));
  },

  // Enhanced sales metrics
  async getSalesMetrics({ startDate, endDate, onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const { start, end } = parseDateRange({ startDate, endDate });
    
    const metrics = await Sale.aggregate([
      { $match: { soldAt: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
      { $match: onlyStatuses && onlyStatuses.length > 0 ? { 'orderInfo.status': { $in: onlyStatuses } } : {} },
      {
        $group: {
          _id: null,
          totalItemsSold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalLinePrice' },
          uniqueProducts: { $addToSet: '$product' },
          uniqueOrders: { $addToSet: '$orderId' },
          avgItemsPerOrder: { $avg: '$quantity' },
          maxOrderValue: { $max: '$totalLinePrice' },
          minOrderValue: { $min: '$totalLinePrice' }
        }
      },
      {
        $project: {
          _id: 0,
          totalItemsSold: 1,
          totalRevenue: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          totalOrders: { $size: '$uniqueOrders' },
          avgItemsPerOrder: { $round: ['$avgItemsPerOrder', 2] },
          maxOrderValue: 1,
          minOrderValue: 1
        }
      }
    ]);
    
    return metrics[0] || {
      totalItemsSold: 0,
      totalRevenue: 0,
      uniqueProductCount: 0,
      totalOrders: 0,
      avgItemsPerOrder: 0,
      maxOrderValue: 0,
      minOrderValue: 0
    };
  },

  
   // 9) getComprehensiveReport:
   //  Combines revenue summary, AOV, top products, category breakdown,
   //      low stock alerts, monthly trend, inventory logs, and price changes— 
   //     all in one JSON payload. Useful for a single “master dashboard” call.
   
  async getComprehensiveReport({ startDate, endDate, lowStockThreshold = 5, year, onlyStatuses = DEFAULT_SALE_STATUSES }) {
    const InventoryService = require('../services/inventoryService');
    const limit = DEFAULT_REPORT_LIMIT;

    // Get comprehensive data in parallel
    const [
      revenueSummary,
      aov,
      topProductsByQty,
      salesByCat,
      inventoryData,
      monthlyTrend,
      inventoryLogSummary,
      priceChangeEvents,
      salesMetrics,
      recentOrders
    ] = await Promise.all([
      this.getRevenueSummary({ startDate, endDate, onlyStatuses }),
      this.getAverageOrderValue({ startDate, endDate, onlyStatuses }),
      this.getTopSellingProducts({ startDate, endDate, limit, onlyStatuses, sortBy: 'quantity' }),
      this.getSalesByCategory({ startDate, endDate, onlyStatuses }),
      InventoryService.getDashboardData(),
      this.getMonthlySalesTrend({ year, onlyStatuses }),
      this.getInventoryLogSummary({ startDate, endDate }),
      this.getPriceChangeEvents({ startDate, endDate }),
      this.getSalesMetrics({ startDate, endDate, onlyStatuses }),
      this.getRecentOrders({ limit: 10 })
    ]);

    // Get top products by revenue
    const topProductsByRevenue = await this.getTopSellingProducts({ startDate, endDate, limit, onlyStatuses, sortBy: 'revenue' });
    // Return comprehensive report with pure database data
    return {
      // Sales data - pure from database
      revenueSummary: revenueSummary || { totalRevenue: 0, totalOrders: 0 },
      aov: aov || { averageOrderValue: 0, orderCount: 0 },
      topProducts: Array.isArray(topProductsByQty) ? topProductsByQty : [],
      topProductsByRevenue: Array.isArray(topProductsByRevenue) ? topProductsByRevenue : [],
      salesByCat: Array.isArray(salesByCat) ? salesByCat : [],
      monthlyTrend: Array.isArray(monthlyTrend) ? monthlyTrend : [],
      
      // Enhanced sales metrics - pure from database
      salesMetrics: salesMetrics || {
        totalItemsSold: 0,
        uniqueProductCount: 0,
        avgItemsPerOrder: 0,
        maxOrderValue: 0,
        minOrderValue: 0
      },
      
      // Inventory data - pure from database
      lowStockAlerts: inventoryData.lowStockAlerts || [],
      criticalStockCount: inventoryData.criticalStockCount || 0,
      recentMovements: inventoryData.recentMovements || [],
      
      // Product statistics - pure from database
      totalProducts: inventoryData.totalProducts || 0,
      totalVariants: inventoryData.totalVariants || 0,
      activeProducts: inventoryData.activeProducts || 0,
      draftProducts: inventoryData.draftProducts || 0,
      inactiveProducts: inventoryData.inactiveProducts || 0,
      
      // Stock status - pure from database
      inStockVariants: inventoryData.inStockVariants || 0,
      lowStockVariants: inventoryData.lowStockVariants || 0,
      outOfStockVariants: inventoryData.outOfStockVariants || 0,
      
      // Financial - pure from database
      stockValue: inventoryData.stockValue || 0,

      // Additional analytics - pure from database
      inventoryLogSummary: inventoryLogSummary || {},
      priceChangeEvents: Array.isArray(priceChangeEvents) ? priceChangeEvents : [],
      recentOrders: Array.isArray(recentOrders) ? recentOrders : []
    };
  },

  // Get recent orders
  async getRecentOrders({ limit = 10 }) {
    try {
      const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customer', 'fullname email')
        .lean();
      
      return orders.map(order => ({
        _id: order._id,
        orderId: order.orderId || order._id,
        customerName: order.customer?.fullname || order.shippingAddress?.fullName || 'Guest',
        totalAmount: order.totalAmount || 0,
        status: order.status,
        items: order.items || [],
        createdAt: order.createdAt
      }));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }
};