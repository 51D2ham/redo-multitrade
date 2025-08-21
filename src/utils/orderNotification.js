const NotificationService = require('../services/notificationService');

// Send order confirmation email
const sendOrderConfirmation = async (userEmail, order, shippingAddress) => {
  try {
    await NotificationService.sendOrderConfirmation(userEmail, {
      customerName: 'Customer',
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8),
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      totalPrice: order.totalPrice,
      totalItem: order.totalItem,
      paymentMethod: order.paymentMethod,
      items: order.items
    });
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }
};

// Send order status update
const sendOrderStatusUpdate = async (userEmail, order, newStatus, message) => {
  try {
    await NotificationService.sendOrderStatusUpdate(userEmail, {
      customerName: 'Customer',
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8),
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      items: order.items,
      trackingNumber: order.trackingNumber,
      reason: message
    }, newStatus);
  } catch (error) {
    console.error('Failed to send order status update email:', error);
  }
};

// Send individual item status update
const sendItemStatusUpdate = async (userEmail, order, item, newStatus, message) => {
  try {
    await NotificationService.sendOrderStatusUpdate(userEmail, {
      customerName: 'Customer',
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8),
      totalPrice: order.totalPrice,
      items: [item],
      reason: message
    }, newStatus);
  } catch (error) {
    console.error('Failed to send item status update email:', error);
  }
};

// Send bulk status update
const sendBulkStatusUpdate = async (userEmail, order, updatedItems) => {
  try {
    const items = updatedItems.map(({ item }) => item);
    await NotificationService.sendOrderStatusUpdate(userEmail, {
      customerName: 'Customer',
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8),
      totalPrice: order.totalPrice,
      items: items
    }, 'processing');
  } catch (error) {
    console.error('Failed to send bulk status update email:', error);
  }
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendItemStatusUpdate,
  sendBulkStatusUpdate
};