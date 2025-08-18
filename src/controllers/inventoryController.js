const InventoryService = require('../services/inventoryService');
const { StatusCodes } = require('http-status-codes');
const { Product } = require('../models/productModel');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// GET /admin/inventory - Enhanced Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const data = await InventoryService.getDashboardData();
    
    // Get top products by stock value for additional insights
    const { Product } = require('../models/productModel');
    const topProducts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$variants' },
      {
        $group: {
          _id: '$_id',
          title: { $first: '$title' },
          thumbnail: { $first: '$thumbnail' },
          totalStock: { $sum: '$variants.qty' },
          stockValue: {
            $sum: {
              $multiply: [
                '$variants.qty',
                { $ifNull: ['$variants.costPrice', '$variants.price'] }
              ]
            }
          }
        }
      },
      { $sort: { stockValue: -1 } },
      { $limit: 5 }
    ]);
    
    res.render('inventory/dashboard', {
      title: 'Inventory Dashboard',
      data: { ...data, topProducts },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Inventory dashboard error:', error);
    req.flash('error', 'Failed to load inventory dashboard');
    
    const defaultData = {
      lowStockCount: 0,
      criticalStockCount: 0,
      recentMovements: [],
      lowStockAlerts: [],
      totalProducts: 0,
      totalVariants: 0,
      stockValue: 0,
      topProducts: []
    };
    
    res.render('inventory/dashboard', {
      title: 'Inventory Dashboard',
      data: defaultData,
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
};

// GET /admin/inventory/low-stock - Enhanced low stock alerts with filtering
exports.getLowStock = async (req, res) => {
  try {
    const { status, category, brand, minStock, maxStock } = req.query;
    const alerts = await InventoryService.getStockAlerts({
      status,
      category,
      brand,
      minStock: minStock ? parseInt(minStock) : undefined,
      maxStock: maxStock ? parseInt(maxStock) : undefined
    });
    
    // Get filter options
    const { Product } = require('../models/productModel');
    const { Category, Brand } = require('../models/parametersModel');
    const [categories, brands] = await Promise.all([
      Product.distinct('category').then(ids => 
        Category.find({ _id: { $in: ids } }).select('name')
      ),
      Product.distinct('brand').then(ids => 
        Brand.find({ _id: { $in: ids } }).select('name')
      )
    ]);
    
    res.render('inventory/low-stock', {
      title: 'Low Stock Alerts',
      alerts,
      categories: categories || [],
      brands: brands || [],
      filters: req.query,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Low stock error:', error);
    req.flash('error', 'Failed to load low stock alerts');
    
    res.render('inventory/low-stock', {
      title: 'Low Stock Alerts',
      alerts: [],
      categories: [],
      brands: [],
      filters: req.query,
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
};

// GET /admin/inventory/movements - Movement history
exports.getMovements = async (req, res) => {
  try {
    const { productId, type, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const currentPage = parseInt(page);
    const pageLimit = parseInt(limit);
    
    const movements = await InventoryService.getMovementReport({
      productId,
      type,
      dateFrom,
      dateTo,
      limit: pageLimit,
      skip: (currentPage - 1) * pageLimit
    });
    
    // Get products for filter dropdown
    const products = await Product.find({ status: 'active' })
      .select('title')
      .sort({ title: 1 })
      .limit(100);
    
    res.render('inventory/movements', {
      title: 'Inventory Movements',
      movements,
      products,
      filters: req.query,
      pagination: {
        current: currentPage,
        limit: pageLimit,
        hasNext: movements.length === pageLimit,
        hasPrev: currentPage > 1,
        next: currentPage + 1,
        prev: currentPage - 1
      },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Movements error:', error);
    req.flash('error', 'Failed to load inventory movements');
    
    res.render('inventory/movements', {
      title: 'Inventory Movements',
      movements: [],
      products: [],
      filters: req.query,
      pagination: {
        current: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 20),
        hasNext: false,
        hasPrev: false
      },
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
};

// POST /admin/inventory/restock - Enhanced restock with better validation
exports.restock = async (req, res) => {
  try {
    const { productId, variantSku, quantity, notes, unitCost } = req.body;
    const adminId = req.session?.admin?.id;
    
    // Enhanced validation
    if (!adminId) {
      req.flash('error', 'Authentication required');
      return res.redirect('/admin/v1/staff/login');
    }
    
    if (!productId || !isValidObjectId(productId)) {
      req.flash('error', 'Invalid product ID');
      return res.redirect('/admin/inventory');
    }
    
    if (!variantSku || !variantSku.trim()) {
      req.flash('error', 'Variant SKU is required');
      return res.redirect('back');
    }
    
    const restockQuantity = parseInt(quantity);
    if (!restockQuantity || restockQuantity <= 0) {
      req.flash('error', 'Quantity must be a positive number');
      return res.redirect('back');
    }
    
    const cost = unitCost && parseFloat(unitCost) > 0 ? parseFloat(unitCost) : undefined;
    
    const result = await InventoryService.restock(
      productId, 
      variantSku.trim(), 
      restockQuantity, 
      adminId, 
      notes?.trim() || `Restocked ${restockQuantity} units`,
      cost
    );
    
    req.flash('success', `Successfully restocked ${restockQuantity} units of ${variantSku}${cost ? ` at ₹${cost} per unit` : ''}`);
    
    // Redirect to product page if coming from product management
    if (req.body.returnTo === 'product') {
      return res.redirect(`/admin/v1/products/${productId}`);
    }
    
    res.redirect('/admin/inventory');
  } catch (error) {
    console.error('Restock error:', error);
    req.flash('error', error.message || 'Failed to restock product');
    res.redirect('back');
  }
};

// POST /admin/inventory/adjust - Enhanced stock adjustment
exports.adjustStock = async (req, res) => {
  try {
    const { productId, variantSku, newQuantity, notes, reason } = req.body;
    const adminId = req.session?.admin?.id;
    
    // Enhanced validation
    if (!adminId) {
      req.flash('error', 'Authentication required');
      return res.redirect('/admin/v1/staff/login');
    }
    
    if (!productId || !isValidObjectId(productId)) {
      req.flash('error', 'Invalid product ID');
      return res.redirect('/admin/inventory');
    }
    
    if (!variantSku || !variantSku.trim()) {
      req.flash('error', 'Variant SKU is required');
      return res.redirect('back');
    }
    
    const adjustedQuantity = parseInt(newQuantity);
    if (isNaN(adjustedQuantity) || adjustedQuantity < 0) {
      req.flash('error', 'Quantity must be a non-negative number');
      return res.redirect('back');
    }
    
    const adjustmentReason = reason?.trim() || 'manual_correction';
    
    const result = await InventoryService.adjustStock(
      productId, 
      variantSku.trim(), 
      adjustedQuantity, 
      adminId, 
      notes?.trim() || `Stock manually adjusted to ${adjustedQuantity} units`,
      adjustmentReason
    );
    
    req.flash('success', `Stock for ${variantSku} adjusted to ${adjustedQuantity} units`);
    
    // Redirect to product page if coming from product management
    if (req.body.returnTo === 'product') {
      return res.redirect(`/admin/v1/products/${productId}`);
    }
    
    res.redirect('/admin/inventory');
  } catch (error) {
    console.error('Stock adjustment error:', error);
    req.flash('error', error.message || 'Failed to adjust stock');
    res.redirect('back');
  }
};

// GET /admin/inventory/product/:id - Get product variants for AJAX
exports.getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    const product = await Product.findById(id).select('title variants');
    
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        title: product.title,
        variants: product.variants.map(v => ({
          _id: v._id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          qty: v.qty,
          thresholdQty: v.thresholdQty,
          status: v.status
        }))
      }
    });
  } catch (error) {
    console.error('Get product variants error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get product variants'
    });
  }
};

// API endpoints
exports.getLowStockAPI = async (req, res) => {
  try {
    const alerts = await InventoryService.getLowStockAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to fetch low stock alerts' 
    });
  }
};

exports.getMovementsAPI = async (req, res) => {
  try {
    const movements = await InventoryService.getMovementReport(req.query);
    res.json({ success: true, data: movements });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to fetch movements' 
    });
  }
};

// GET /admin/inventory/product/:id/summary - Get product stock summary
exports.getProductSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await InventoryService.getProductStockSummary(id);
    
    res.render('inventory/product-summary', {
      title: `Stock Summary - ${summary.product.title}`,
      summary,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Product summary error:', error);
    req.flash('error', error.message || 'Failed to load product summary');
    res.redirect('/admin/inventory');
  }
};

// POST /admin/inventory/bulk-update - Bulk stock update
exports.bulkUpdate = async (req, res) => {
  try {
    const { updates, notes } = req.body;
    const adminId = req.session?.admin?.id;
    
    if (!adminId) {
      req.flash('error', 'Authentication required');
      return res.redirect('/admin/v1/staff/login');
    }
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      req.flash('error', 'No updates provided');
      return res.redirect('back');
    }
    
    const result = await InventoryService.bulkUpdateStock(updates, adminId, notes);
    
    if (result.results.length > 0) {
      req.flash('success', `Successfully updated ${result.results.length} items`);
    }
    
    if (result.errors.length > 0) {
      req.flash('error', `Failed to update ${result.errors.length} items`);
    }
    
    res.redirect('/admin/inventory');
  } catch (error) {
    console.error('Bulk update error:', error);
    req.flash('error', error.message || 'Failed to perform bulk update');
    res.redirect('back');
  }
};