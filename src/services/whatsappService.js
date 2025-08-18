// // whatsappService.js
// // Service to send WhatsApp messages to owner and customer after order placement

// const axios = require('axios');

// // Replace with your WhatsApp API endpoint and credentials
// const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
// const OWNER_PHONE = process.env.OWNER_PHONE || '123455678';


// async function sendWhatsAppMessage(to, message) {
//   try {
//     await axios.post(WHATSAPP_API_URL, {
//       to,
//       message
//     });
//     return true;
//   } catch (err) {
//     console.error('WhatsApp send error:', err.message);
//     return false;
//   }
// }

// async function notifyOrderPlaced(order, customerPhone) {
//   // Build item summary
//   let itemsSummary = '';
//   if (order.items && Array.isArray(order.items)) {
//     itemsSummary = order.items.map((item, idx) =>
//       `${idx+1}. ${item.productTitle || item.product || ''} (${item.variantSku || ''}) x${item.quantity}`
//     ).join('\n');
//   }

//   // Build address
//   let address = '';
//   if (order.shippingAddress) {
//     address = `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.postalCode || ''}`;
//   }

//   // Payment method
//   const payment = order.paymentMethod || 'COD';

//   // Customer message
//   const orderMsg = ` *Order Placed Successfully!*\n\nOrder ID: ${order._id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.customerName}\nPayment: ${payment}\n\nItems:\n${itemsSummary}\n\nDelivery Address:\n${address}\n\nThank you for shopping with us!`;

//   // Owner message
//   const ownerMsg = ` *New Order Received!*\n\nOrder ID: ${order._id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.customerName} (${customerPhone})\nPayment: ${payment}\n\nItems:\n${itemsSummary}\n\nDelivery Address:\n${address}`;

//   await sendWhatsAppMessage(customerPhone, orderMsg);
//   await sendWhatsAppMessage(OWNER_PHONE, ownerMsg);
// }

// module.exports = { sendWhatsAppMessage, notifyOrderPlaced };








// can refer the below steps to integrate or the docs 

// Sign up for a WhatsApp API provider (Twilio, Meta, etc.).
// Replace WHATSAPP_API_URL with the provider’s actual API endpoint.
// Update the axios payload to match the provider’s requirements (usually includes authentication, message body, recipient, etc.).
// Add any required headers (like Authorization tokens).