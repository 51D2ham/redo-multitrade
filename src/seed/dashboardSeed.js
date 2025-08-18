const mongoose = require('mongoose');
const { Product } = require('../models/productModel');
const Order = require('../models/orderModel');
const Sale = require('../models/saleModel');
const InventoryLog = require('../models/inventoryLogModel');

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Seed products
async function seedProducts() {
  const products = [
    {
      title: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      status: 'active',
      variants: [{
        sku: 'WBH-001',
        color: 'Black',
        size: 'Standard',
        price: 2999,
        costPrice: 1500,
        qty: 25,
        thresholdQty: 5,
        status: 'in_stock'
      }]
    },
    {
      title: 'Gaming Mechanical Keyboard',
      description: 'RGB mechanical keyboard for gaming',
      status: 'active',
      variants: [{
        sku: 'GMK-002',
        color: 'Black',
        size: 'Full Size',
        price: 4999,
        costPrice: 2500,
        qty: 15,
        thresholdQty: 3,
        status: 'in_stock'
      }]
    },
    {
      title: 'USB-C Fast Charger',
      description: '65W USB-C fast charger',
      status: 'active',
      variants: [{
        sku: 'UFC-003',
        color: 'White',
        size: 'Standard',
        price: 1299,
        costPrice: 600,
        qty: 2,
        thresholdQty: 5,
        status: 'low_stock'
      }]
    },
    {
      title: 'Smartphone Case Premium',
      description: 'Premium protective case for smartphones',
      status: 'active',
      variants: [{
        sku: 'SCP-004',
        color: 'Clear',
        size: 'iPhone 14',
        price: 899,
        costPrice: 300,
        qty: 0,
        thresholdQty: 10,
        status: 'out_of_stock'
      }]
    },
    {
      title: 'Wireless Mouse Pro',
      description: 'Ergonomic wireless mouse',
      status: 'active',
      variants: [{
        sku: 'WMP-005',
        color: 'Black',
        size: 'Standard',
        price: 1599,
        costPrice: 800,
        qty: 30,
        thresholdQty: 8,
        status: 'in_stock'
      }]
    }
  ];

  await Product.deleteMany({});
  const createdProducts = await Product.insertMany(products);
  console.log(`Created ${createdProducts.length} products`);
  return createdProducts;
}

// Seed orders
async function seedOrders(products) {
  const orders = [];
  const sales = [];
  
  for (let i = 0; i < 20; i++) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    const order = {
      orderId: `ORD${Date.now()}${i}`,
      totalAmount: randomProduct.variants[0].price * quantity,
      status: ['Completed', 'Delivered', 'Shipped'][Math.floor(Math.random() * 3)],
      items: [{
        productId: randomProduct._id,
        productTitle: randomProduct.title,
        variantSku: randomProduct.variants[0].sku,
        qty: quantity,
        price: randomProduct.variants[0].price
      }],
      shippingAddress: {
        fullName: `Customer ${i + 1}`,
        street: `Address ${i + 1}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001'
      },
      createdAt: orderDate
    };
    
    orders.push(order);
    
    // Create corresponding sale
    const sale = {
      product: randomProduct._id,
      variantSku: randomProduct.variants[0].sku,
      quantity: quantity,
      unitPrice: randomProduct.variants[0].price,
      totalLinePrice: randomProduct.variants[0].price * quantity,
      soldAt: orderDate
    };
    
    sales.push(sale);
  }

  await Order.deleteMany({});
  await Sale.deleteMany({});
  
  const createdOrders = await Order.insertMany(orders);
  const createdSales = await Sale.insertMany(sales);
  
  console.log(`Created ${createdOrders.length} orders and ${createdSales.length} sales`);
  return { orders: createdOrders, sales: createdSales };
}

// Seed inventory logs
async function seedInventoryLogs(products, sales) {
  const logs = [];
  
  sales.forEach((sale, index) => {
    const product = products.find(p => p._id.equals(sale.product));
    if (product) {
      logs.push({
        product: product._id,
        variantSku: sale.variantSku,
        type: 'sale',
        quantity: sale.quantity,
        previousStock: product.variants[0].qty + sale.quantity,
        newStock: product.variants[0].qty,
        admin: new mongoose.Types.ObjectId(), // Dummy admin ID
        notes: `Sale of ${sale.quantity} units`,
        createdAt: sale.soldAt
      });
    }
  });

  await InventoryLog.deleteMany({});
  const createdLogs = await InventoryLog.insertMany(logs);
  console.log(`Created ${createdLogs.length} inventory logs`);
}

// Main seed function
async function seedDashboardData() {
  try {
    await connectDB();
    
    console.log('Seeding dashboard data...');
    
    const products = await seedProducts();
    const { orders, sales } = await seedOrders(products);
    await seedInventoryLogs(products, sales);
    
    console.log('Dashboard data seeded successfully!');
    console.log('You can now view the dashboard with real data.');
    
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  seedDashboardData();
}

module.exports = seedDashboardData;