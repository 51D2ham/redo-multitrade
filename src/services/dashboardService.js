const InventoryService = require('./inventoryService');
const SalesService = require('./salesService');
const { Product } = require('../models/productModel');
const InventoryLog = require('../models/inventoryLogModel');

class DashboardService {
  static async getLowStockDetails({ threshold = 5, search = '', sortBy = 'stock_asc' }) {
    let query = {
      status: 'active',
      'variants.qty': { $lte: threshold }
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'variants.sku': { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.aggregate([
      { $match: query },
      { $unwind: '$variants' },
      { $match: { 'variants.qty': { $lte: threshold } } },
      {
        $lookup: {
          from: 'inventorylogs',
          let: { productId: '$_id', sku: '$variants.sku' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$product', '$$productId'] },
                    { $eq: ['$variantSku', '$$sku'] },
                    { $eq: ['$type', 'sale'] }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'lastSale'
        }
      },
      {
        $addFields: {
          lastSale: { $arrayElemAt: ['$lastSale', 0] },
          stockStatus: {
            $switch: {
              branches: [
                { case: { $eq: ['$variants.qty', 0] }, then: 'out_of_stock' },
                { case: { $lte: ['$variants.qty', 2] }, then: 'critical' },
                { case: { $lte: ['$variants.qty', threshold] }, then: 'low_stock' }
              ],
              default: 'in_stock'
            }
          }
        }
      }
    ]);

    // Sort results
    const sortFunctions = {
      'stock_asc': (a, b) => a.variants.qty - b.variants.qty,
      'stock_desc': (a, b) => b.variants.qty - a.variants.qty,
      'last_sale_desc': (a, b) => {
        if (!a.lastSale && !b.lastSale) return 0;
        if (!a.lastSale) return 1;
        if (!b.lastSale) return -1;
        return new Date(b.lastSale.createdAt) - new Date(a.lastSale.createdAt);
      },
      'title_asc': (a, b) => a.title.localeCompare(b.title),
      'sku_asc': (a, b) => a.variants.sku.localeCompare(b.variants.sku)
    };

    if (sortFunctions[sortBy]) {
      products.sort(sortFunctions[sortBy]);
    }

    return products.map(p => ({
      productId: p._id,
      productTitle: p.title,
      variantSku: p.variants.sku,
      remainingStock: p.variants.qty,
      thresholdQty: p.variants.thresholdQty,
      stockStatus: p.stockStatus,
      lastSale: p.lastSale ? {
        date: p.lastSale.createdAt,
        quantity: Math.abs(p.lastSale.quantity),
        previousStock: p.lastSale.previousStock
      } : null
    }));
  }

  static async getComprehensiveReport({
    startDate,
    endDate,
    year,
    lowStockThreshold = 5,
    search = '',
    sortBy = 'date_desc',
    productStatus = ''
  }) {
    // Get inventory data with enhanced low stock information
    const [salesReport, lowStockDetails, inventoryData] = await Promise.all([
      SalesService.getComprehensiveReport({ startDate, endDate, year, lowStockThreshold }),
      this.getLowStockDetails({ threshold: lowStockThreshold, search, sortBy }),
      InventoryService.getDashboardData()
    ]);

    return {
      ...salesReport,
      ...inventoryData,
      lowStockAlerts: lowStockDetails,
      stats: {
        totalProducts: inventoryData.totalProducts,
        totalVariants: inventoryData.totalVariants,
        stockValue: inventoryData.stockValue,
        lowStockCount: lowStockDetails.length,
        criticalStockCount: lowStockDetails.filter(p => p.stockStatus === 'critical' || p.stockStatus === 'out_of_stock').length
      }
    };
  }
}

module.exports = DashboardService;
