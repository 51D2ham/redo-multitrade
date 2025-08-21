const NotificationService = require('../services/notificationService');

/**
 * Sends an email to the user when the order status is updated.
 * @param {string} toEmail - Recipient's email address
 * @param {object} order - The updated order object
 */
const sendStatusUpdateEmail = async (toEmail, order) => {
  try {
    await NotificationService.sendOrderStatusUpdate(toEmail, {
      customerName: 'Customer',
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8),
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      totalPrice: order.totalPrice,
      totalItem: order.totalItem,
      paymentMethod: order.paymentMethod,
      items: order.items,
      trackingNumber: order.trackingNumber
    }, order.status);
  } catch (error) {
    console.error('Email error:', error);
  }
};

module.exports = sendStatusUpdateEmail;