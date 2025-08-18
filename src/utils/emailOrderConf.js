const sendMail = require('../config/mail'); 
const generateOrderEmailHTML = require('./emailTemplates/orderConfirmation');

/**
 * Sends an order confirmation email to the customer
 * @param {string} to - Recipient email address
 * @param {Object} order - Mongoose order object
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderConfirmationEmail = async (to, order) => {
  const subject = `Order Confirmation #${order._id}`;
  const html = await generateOrderEmailHTML(order);

  try {
    await sendMail(to, subject, html);
    console.log(`Order confirmation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send order confirmation:', error.message);
    return false;
  }
};

module.exports = sendOrderConfirmationEmail;