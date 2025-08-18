const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Send order confirmation email
const sendOrderConfirmation = async (userEmail, order, shippingAddress) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: `Order Confirmation - Order #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Order Confirmation</h2>
          <p>Thank you for your order! Here are the details:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalPrice}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Shipping Address</h3>
            <p>${shippingAddress.fullname}</p>
            <p>${shippingAddress.street}</p>
            <p>${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}</p>
            <p>${shippingAddress.country}</p>
            <p>Phone: ${shippingAddress.phone}</p>
          </div>

          <p>We'll send you updates as your order progresses.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }
};

// Send order status update
const sendOrderStatusUpdate = async (userEmail, order, newStatus, message) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: `Order Update - Order #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Order Status Update</h2>
          <p>Your order status has been updated:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
            <p><strong>Update Time:</strong> ${new Date().toLocaleString()}</p>
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          </div>

          <p>Thank you for your patience!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order status update email sent successfully');
  } catch (error) {
    console.error('Failed to send order status update email:', error);
  }
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate
};