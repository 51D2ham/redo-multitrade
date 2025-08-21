require('dotenv').config();
const connectDb = require('../config/connectDb');
const mongoose = require('mongoose');
const Sale = require('../models/saleModel');
const { Order } = require('../models/orderModel');

async function backfill({ dryRun = false, limit = null } = {}) {
  await connectDb();
  console.log('Starting backfill: scanning orders for missing Sale documents...');
  try {
    const query = {};
    const cursor = Order.find(query).sort({ createdAt: -1 }).cursor();
    let processedOrders = 0;
    let createdSales = 0;
    for (let ord = await cursor.next(); ord != null; ord = await cursor.next()) {
      processedOrders++;
      if (!ord.items || ord.items.length === 0) continue;
      for (const item of ord.items) {
        try {
          if (!item.productId) continue; // skip malformed items
          const exists = await Sale.findOne({ orderId: ord._id, product: item.productId, variantSku: item.variantSku || '' }).lean();
          if (exists) continue; // idempotent
          if (dryRun) {
            createdSales++;
            continue;
          }
          const saleDoc = new Sale({
            orderId: ord._id,
            product: item.productId,
            variantSku: item.variantSku || '',
            quantity: item.qty || 0,
            salePrice: item.productPrice || 0,
            totalLinePrice: item.totalPrice || (item.qty || 0) * (item.productPrice || 0),
            soldAt: ord.createdAt || new Date()
          });
          await saleDoc.save();
          createdSales++;
        } catch (e) {
          console.error('Failed creating Sale for order', ord._id && ord._id.toString(), 'item', item && (item.variantSku || item.productId), e && e.message ? e.message : e);
        }
      }
      if (limit && processedOrders >= limit) break;
    }

    console.log(`Backfill complete. Orders processed: ${processedOrders}, Sales created (or would be created in dryRun): ${createdSales}`);
  } catch (err) {
    console.error('Backfill error:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

// CLI
// Usage: node backfillSalesFromOrders.js --dry or --limit=100
const argv = require('minimist')(process.argv.slice(2));
const dry = argv.dry || argv.dryRun || false;
const limit = argv.limit ? parseInt(argv.limit, 10) : null;
backfill({ dryRun: dry, limit }).then(() => {
  console.log('Done');
}).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
