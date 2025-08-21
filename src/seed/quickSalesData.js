const mongoose = require('mongoose');
const Sale = require('../models/saleModel');
const { Order } = require('../models/orderModel');

async function createQuickSalesData() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('Connected to MongoDB');

    // Clear existing sales
    await Sale.deleteMany({});
    
    // Create sample sales data for the last 6 months
    const salesData = [];
    const currentDate = new Date();
    
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const saleDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthOffset, 15);
      const monthSales = Math.floor(Math.random() * 10) + 5; // 5-15 sales per month
      
      for (let i = 0; i < monthSales; i++) {
        const saleAmount = Math.floor(Math.random() * 50000) + 5000; // ₹5k-55k per sale
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
        
        salesData.push({
          orderId: new mongoose.Types.ObjectId(),
          product: new mongoose.Types.ObjectId(),
          variantSku: `SKU-${Math.floor(Math.random() * 1000)}`,
          quantity: quantity,
          salePrice: Math.floor(saleAmount / quantity),
          totalLinePrice: saleAmount,
          soldAt: new Date(saleDate.getTime() + (Math.random() * 30 * 24 * 60 * 60 * 1000)) // Random day in month
        });
      }
    }
    
    await Sale.insertMany(salesData);
    console.log(`Created ${salesData.length} sales records`);
    
    await mongoose.disconnect();
    console.log('Quick sales data created successfully!');
  } catch (error) {
    console.error('Error creating sales data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  require('dotenv').config();
  createQuickSalesData();
}

module.exports = createQuickSalesData;