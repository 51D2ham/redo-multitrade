const Sale = require('../models/saleModel');
const { Order } = require('../models/orderModel');
const { Category } = require('../models/parametersModel');
const { Product } = require('../models/productModel');

class SalesService {
  // Record sales only for delivered items
  static async recordSalesForDeliveredItems(orderId, adminId = null) {
    try {
      if (!orderId) {
        return { success: false, error: 'Order ID is required' };
      }

      const order = await Order.findById(orderId).populate('items.productId');
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const deliveredItems = order.items.filter(item => 
        item.status === 'delivered' && item.productId && item.qty > 0
      );
      
      if (deliveredItems.length === 0) {
        return { success: true, salesRecords: [], count: 0, message: 'No delivered items to record' };
      }

      const salesRecords = [];
      const errors = [];

      for (const item of deliveredItems) {
        try {
          // Check if sale already recorded for this item
          const existingSale = await Sale.findOne({
            orderId: orderId,
            product: item.productId._id || item.productId,
            variantSku: item.variantSku || 'default'
          });

          if (!existingSale) {
            const sale = new Sale({
              orderId: orderId,
              product: item.productId._id || item.productId,
              variantSku: item.variantSku || 'default',
              quantity: Number(item.qty) || 0,
              salePrice: Number(item.productPrice) || 0,
              totalLinePrice: Number(item.totalPrice) || 0,
              soldAt: new Date()
            });

            await sale.save();
            salesRecords.push(sale);
          }
        } catch (itemError) {
          console.error(`Error recording sale for item ${item.productTitle}:`, itemError);
          errors.push(`Failed to record sale for ${item.productTitle}: ${itemError.message}`);
        }
      }

      return { 
        success: errors.length === 0, 
        salesRecords, 
        count: salesRecords.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Sales recording error:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove sales records for cancelled items
  static async removeSalesForCancelledItems(orderId, itemProductId, variantSku) {
    try {
      if (!orderId || !itemProductId) {
        return { success: false, error: 'Order ID and Product ID are required' };
      }

      const result = await Sale.deleteMany({
        orderId: orderId,
        product: itemProductId,
        variantSku: variantSku || 'default'
      });

      return { 
        success: true, 
        deletedCount: result.deletedCount,
        message: result.deletedCount > 0 
          ? `Removed ${result.deletedCount} sales records` 
          : 'No sales records found to remove'
      };
    } catch (error) {
      console.error('Sales removal error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sales report with refined data
  static async getSalesReport(filters = {}) {
    try {
      const { dateFrom, dateTo, productId, limit = 50, skip = 0 } = filters;
      
      const query = {};
      if (productId) query.product = productId;
      if (dateFrom || dateTo) {
        query.soldAt = {};
        if (dateFrom) query.soldAt.$gte = new Date(dateFrom);
        if (dateTo) query.soldAt.$lte = new Date(dateTo);
      }

      const sales = await Sale.find(query)
        .populate('product', 'title thumbnail brand category')
        .populate('orderId', 'status paid user')
        .sort({ soldAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalSales = await Sale.countDocuments(query);
      const totalRevenue = await Sale.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$totalLinePrice' } } }
      ]);

      return {
        success: true,
        sales,
        totalSales,
        totalRevenue: totalRevenue[0]?.total || 0,
        pagination: {
          current: Math.floor(skip / limit) + 1,
          total: Math.ceil(totalSales / limit),
          hasNext: skip + limit < totalSales,
          hasPrev: skip > 0
        }
      };
    } catch (error) {
      console.error('Sales report error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get comprehensive report for dashboard
  static async getComprehensiveReport(filters = {}) {
    try {
      const { startDate, endDate, year, lowStockThreshold = 5 } = filters;
      const currentYear = year || new Date().getFullYear();
      
      // Build date filter
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          soldAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      } else {
        // Default to current year
        dateFilter = {
          soldAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        };
      }

      // Get revenue summary from delivered items only
      const revenueSummary = await Sale.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalLinePrice' },
            totalOrders: { $addToSet: '$orderId' }
          }
        },
        {
          $project: {
            totalRevenue: 1,
            totalOrders: { $size: '$totalOrders' }
          }
        }
      ]);
      
      // Get order-level metrics (for mixed status orders)
      const orderMetrics = await Order.aggregate([
        { $match: { createdAt: dateFilter.soldAt } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$_id',
            deliveredValue: {
              $sum: {
                $cond: [
                  { $eq: ['$items.status', 'delivered'] },
                  '$items.totalPrice',
                  0
                ]
              }
            },
            hasDeliveredItems: {
              $max: {
                $cond: [
                  { $eq: ['$items.status', 'delivered'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $match: { hasDeliveredItems: 1 }
        },
        {
          $group: {
            _id: null,
            totalOrdersWithDeliveries: { $sum: 1 },
            totalDeliveredValue: { $sum: '$deliveredValue' }
          }
        }
      ]);

      const salesRevenue = revenueSummary[0] || { totalRevenue: 0, totalOrders: 0 };
      const orderRevenue = orderMetrics[0] || { totalOrdersWithDeliveries: 0, totalDeliveredValue: 0 };
      
      // Use sales data if available, otherwise fall back to order data
      const revenue = {
        totalRevenue: salesRevenue.totalRevenue || orderRevenue.totalDeliveredValue || 0,
        totalOrders: salesRevenue.totalOrders || orderRevenue.totalOrdersWithDeliveries || 0
      };

      // Calculate AOV
      const aov = {
        averageOrderValue: revenue.totalOrders > 0 ? revenue.totalRevenue / revenue.totalOrders : 0,
        orderCount: revenue.totalOrders
      };

      // Get monthly trend from actual orders
      const monthlyData = await Order.aggregate([
        { $match: { createdAt: dateFilter.soldAt || { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) } } },
        { $unwind: '$items' },
        {
          $match: {
            'items.status': 'delivered'
          }
        },
        {
          $group: {
            _id: { 
              month: { $month: '$createdAt' },
              orderId: '$_id'
            },
            monthlyRevenue: { $sum: '$items.totalPrice' }
          }
        },
        {
          $group: {
            _id: '$_id.month',
            totalRevenue: { $sum: '$monthlyRevenue' },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $project: {
            month: '$_id',
            totalRevenue: 1,
            totalOrders: 1
          }
        }
      ]);

      // Create complete 12-month array with proper data types
      const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const existing = monthlyData.find(m => m.month === monthNum);
        return {
          month: monthNum,
          totalRevenue: Number(existing ? existing.totalRevenue : 0),
          totalOrders: Number(existing ? existing.totalOrders : 0)
        };
      });
      


      // Get top products from delivered order items
      const topProducts = await Order.aggregate([
        { $match: { createdAt: dateFilter.soldAt || { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) } } },
        { $unwind: '$items' },
        { $match: { 'items.status': 'delivered' } },
        {
          $group: {
            _id: '$items.productId',
            totalQuantity: { $sum: '$items.qty' },
            totalRevenue: { $sum: '$items.totalPrice' },
            productName: { $first: '$items.productTitle' }
          }
        },
        {
          $project: {
            name: '$productName',
            totalQuantity: 1,
            totalRevenue: 1
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);

      // Get sales by category from delivered order items
      const salesByCat = await Order.aggregate([
        { $match: { createdAt: dateFilter.soldAt || { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) } } },
        { $unwind: '$items' },
        { $match: { 'items.status': 'delivered' } },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: { $ifNull: ['$category.name', 'Unknown Category'] } },
            totalRevenue: { $sum: '$items.totalPrice' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);

      // Get recent orders with proper customer and amount data
      const recentOrders = await Order.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $addFields: {
            customerName: { $ifNull: [{ $arrayElemAt: ['$customer.fullname', 0] }, 'Customer'] },
            totalAmount: '$totalPrice',
            deliveredItems: {
              $size: {
                $filter: {
                  input: '$items',
                  cond: { $eq: ['$$this.status', 'delivered'] }
                }
              }
            },
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
        }
      ]);

      return {
        revenueSummary: revenue,
        aov,
        topProducts,
        salesByCat,
        monthlyTrend,
        recentOrders,
        salesMetrics: {
          totalItemsSold: topProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
          uniqueProductCount: topProducts.length,
          avgItemsPerOrder: revenue.totalOrders > 0 ? topProducts.reduce((sum, p) => sum + p.totalQuantity, 0) / revenue.totalOrders : 0,
          maxOrderValue: 0, // Would need order-level calculation
          minOrderValue: 0   // Would need order-level calculation
        }
      };
    } catch (error) {
      console.error('Comprehensive report error:', error);
      return {
        revenueSummary: { totalRevenue: 0, totalOrders: 0 },
        aov: { averageOrderValue: 0, orderCount: 0 },
        topProducts: [],
        salesByCat: [],
        monthlyTrend: [],
        recentOrders: [],
        salesMetrics: { totalItemsSold: 0, uniqueProductCount: 0, avgItemsPerOrder: 0, maxOrderValue: 0, minOrderValue: 0 }
      };
    }
  }
}

module.exports = SalesService;