const sendMail = require('../config/mail');

class NotificationService {
  static async sendNotification(type, recipient, data = {}) {
    try {
      const { subject, html } = this.getEmailContent(type, data);
      const result = await sendMail(recipient, subject, html);
      
      if (result.success) {
        console.log(`✅ ${type} notification sent to ${recipient}`);
        return { success: true, messageId: result.info?.messageId };
      } else {
        console.error(`❌ Failed to send ${type} notification to ${recipient}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`❌ Notification service error for ${type}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  static getEmailContent(type, data) {
    const subject = this.getSubject(type, data);
    const html = this.getTemplate(type, data);
    return { subject, html };
  }

  static getTemplate(type, data) {
    const baseTemplate = this.getBaseTemplate();
    const content = this.getContent(type, data);
    
    return baseTemplate
      .replace('{{TITLE}}', content.title)
      .replace('{{MESSAGE}}', content.message)
      .replace('{{BODY}}', content.body)
      .replace('{{ACTION_BUTTON}}', content.action ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${content.action.url}" style="display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${content.action.text}</a>
        </div>
      ` : '')
      .replace('{{COMPANY_NAME}}', 'Multitrade')
      .replace('{{CURRENT_YEAR}}', new Date().getFullYear())
      .replace('{{SUPPORT_EMAIL}}', process.env.SUPPORT_EMAIL || 'support@multitrade.com');
  }

  static getBaseTemplate() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{{TITLE}}</title>
      <style>
        body { margin: 0; padding: 0; background: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header .logo { font-size: 24px; font-weight: 800; margin-bottom: 10px; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1f2937; margin: 0 0 20px 0; font-size: 24px; }
        .content p { color: #4b5563; line-height: 1.6; margin: 15px 0; }
        .content ul { color: #4b5563; line-height: 1.8; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .footer a { color: #4f46e5; text-decoration: none; }
        .otp-box { background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
        .otp-code { font-size: 36px; font-weight: 800; color: #0c4a6e; letter-spacing: 6px; margin: 10px 0; }
        .info-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .error-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        @media (max-width: 600px) {
          .container { margin: 10px; border-radius: 8px; }
          .header, .content, .footer { padding: 20px; }
          .header h1 { font-size: 24px; }
          .otp-code { font-size: 28px; letter-spacing: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">{{COMPANY_NAME}}</div>
          <h1>{{TITLE}}</h1>
        </div>
        <div class="content">
          <h2>{{MESSAGE}}</h2>
          {{BODY}}
          {{ACTION_BUTTON}}
        </div>
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:{{SUPPORT_EMAIL}}">{{SUPPORT_EMAIL}}</a></p>
          <p>&copy; {{CURRENT_YEAR}} {{COMPANY_NAME}}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  static getSubject(type, data) {
    const subjects = {
      // Authentication
      'customer-welcome': '🎉 Welcome to Multitrade!',
      'customer-password-reset': '🔐 Reset Your Password',
      'customer-password-changed': '✅ Password Changed Successfully',
      'customer-email-verification': '📧 Verify Your Email Address',
      
      // Admin
      'admin-welcome': '👨‍💼 Welcome to Multitrade Admin',
      'admin-password-reset': '🔐 Admin Password Reset',
      'admin-password-changed': '✅ Admin Password Changed',
      
      // Orders
      'order-confirmation': `📦 Order Confirmation #${data.orderNumber || 'N/A'}`,
      'order-processing': `⚡ Order #${data.orderNumber || 'N/A'} is Being Processed`,
      'order-shipped': `🚚 Order #${data.orderNumber || 'N/A'} Has Been Shipped`,
      'order-delivered': `✅ Order #${data.orderNumber || 'N/A'} Delivered`,
      'order-cancelled': `❌ Order #${data.orderNumber || 'N/A'} Cancelled`,
      
      // Inventory
      'low-stock-alert': '⚠️ Low Stock Alert',
      'out-of-stock-alert': '🚨 Out of Stock Alert',
      
      // General
      'system-maintenance': '🔧 Scheduled Maintenance Notice',
      'account-locked': '🔒 Account Security Alert'
    };

    return subjects[type] || 'Multitrade Notification';
  }

  static getContent(type, data) {
    const contents = {
      'customer-welcome': {
        title: 'Welcome to Multitrade! 🎉',
        message: `Hi ${data.name || 'there'},`,
        body: `
          <p>Welcome to Multitrade! We're excited to have you join our community.</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Browse our extensive product catalog</li>
            <li>Add items to your wishlist</li>
            <li>Track your orders in real-time</li>
            <li>Enjoy exclusive member benefits</li>
          </ul>
        `,
        action: {
          text: 'Start Shopping',
          url: `${process.env.WEBSITE_URL || 'http://localhost:9001'}/products`
        }
      },

      'customer-password-reset': {
        title: 'Reset Your Password 🔐',
        message: `Hi ${data.name || 'there'},`,
        body: `
          <p>We received a request to reset your password. Use the code below:</p>
          <div class="otp-box">
            <div class="otp-code">${data.otp || 'XXXXXX'}</div>
            <p style="color: #64748b; margin: 0;">This code expires in 5 minutes</p>
          </div>
          <p>If you didn't request this, please ignore this email or contact support.</p>
        `
      },

      'admin-password-reset': {
        title: 'Admin Password Reset 🔐',
        message: 'Admin Password Reset',
        body: `
          <p>A password reset was requested for your admin account.</p>
          <div class="otp-box">
            <div class="otp-code">${data.otp || 'XXXXXX'}</div>
            <p style="color: #64748b; margin: 0;">This code expires in 5 minutes</p>
          </div>
          <p>If you didn't request this, please contact the system administrator immediately.</p>
        `
      },

      'customer-password-changed': {
        title: 'Password Changed Successfully ✅',
        message: `Hi ${data.name || 'there'},`,
        body: `
          <div class="success-box">
            <p><strong>✅ Password Changed Successfully</strong></p>
            <p>Changed on: ${new Date().toLocaleString()}</p>
          </div>
          <p>If you didn't make this change, please contact our support team immediately.</p>
        `,
        action: {
          text: 'Contact Support',
          url: `mailto:${process.env.SUPPORT_EMAIL || 'support@multitrade.com'}`
        }
      },

      'admin-password-changed': {
        title: 'Admin Password Changed ✅',
        message: 'Password Updated',
        body: `
          <div class="success-box">
            <p><strong>✅ Admin Password Changed Successfully</strong></p>
            <p>Changed on: ${new Date().toLocaleString()}</p>
          </div>
          <p>If you didn't make this change, please contact the system administrator immediately.</p>
        `
      },

      'order-confirmation': {
        title: `Order Confirmed! 📦`,
        message: `Hi ${data.customerName || 'there'},`,
        body: `
          <p>Thank you for your order! We've received your order and it's being prepared.</p>
          <div class="info-box">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">Order Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber || data.orderId || 'N/A'}</p>
            <p><strong>Order Date:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${data.totalAmount?.toLocaleString() || data.totalPrice?.toLocaleString() || '0'}</p>
            <p><strong>Items:</strong> ${data.itemCount || data.totalItem || 0} items</p>
            <p><strong>Payment:</strong> ${data.paymentMethod || 'COD'}</p>
          </div>
          ${data.items ? this.generateOrderItems(data.items) : ''}
          <p>We'll send you another email when your order ships.</p>
        `,
        action: {
          text: 'Track Your Order',
          url: `${process.env.WEBSITE_URL || 'http://localhost:9001'}/orders/${data.orderId || ''}`
        }
      },

      'order-processing': {
        title: `Order Being Processed ⚡`,
        message: `Hi ${data.customerName || 'there'},`,
        body: `
          <p>Your order is now being processed and will be shipped soon.</p>
          <div class="info-box">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">Order Status</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber || data.orderId || 'N/A'}</p>
            <p><strong>Status:</strong> Processing</p>
            <p><strong>Expected Ship Date:</strong> ${data.expectedShipDate || '1-2 business days'}</p>
          </div>
          <p>We'll notify you as soon as your order ships.</p>
        `
      },

      'order-shipped': {
        title: `Your Order is On Its Way! 🚚`,
        message: `Hi ${data.customerName || 'there'},`,
        body: `
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          <div class="info-box">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">Shipping Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber || data.orderId || 'N/A'}</p>
            <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'Will be updated soon'}</p>
            <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery || '3-5 business days'}</p>
          </div>
          <p>You can track your package using the tracking number above.</p>
        `,
        action: {
          text: 'Track Package',
          url: data.trackingUrl || `${process.env.WEBSITE_URL || 'http://localhost:9001'}/orders/${data.orderId || ''}`
        }
      },

      'order-delivered': {
        title: `Order Delivered Successfully! ✅`,
        message: `Hi ${data.customerName || 'there'},`,
        body: `
          <p>Your order has been successfully delivered! We hope you love your purchase.</p>
          <div class="success-box">
            <h3 style="margin: 0 0 15px 0; color: #15803d;">✅ Delivery Confirmed</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber || data.orderId || 'N/A'}</p>
            <p><strong>Delivered On:</strong> ${data.deliveryDate || new Date().toLocaleDateString()}</p>
          </div>
          <p>Please take a moment to review your purchase and let other customers know about your experience.</p>
        `,
        action: {
          text: 'Write a Review',
          url: `${process.env.WEBSITE_URL || 'http://localhost:9001'}/orders/${data.orderId || ''}/review`
        }
      },

      'order-cancelled': {
        title: `Order Cancelled ❌`,
        message: `Hi ${data.customerName || 'there'},`,
        body: `
          <p>Your order has been cancelled as requested.</p>
          <div class="error-box">
            <h3 style="margin: 0 0 15px 0; color: #dc2626;">❌ Cancellation Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber || data.orderId || 'N/A'}</p>
            <p><strong>Cancelled On:</strong> ${data.cancellationDate || new Date().toLocaleDateString()}</p>
            <p><strong>Refund Amount:</strong> ₹${data.refundAmount?.toLocaleString() || data.totalPrice?.toLocaleString() || '0'}</p>
            <p><strong>Reason:</strong> ${data.reason || 'Customer request'}</p>
          </div>
          <p>If you paid online, your refund will be processed within 5-7 business days.</p>
        `
      },

      'low-stock-alert': {
        title: 'Low Stock Alert ⚠️',
        message: 'Admin Alert',
        body: `
          <p>The following products are running low on stock:</p>
          <div class="warning-box">
            ${data.products ? data.products.map(product => `
              <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #fde68a;">
                <p><strong>${product.name || product.title}</strong></p>
                <p>SKU: ${product.sku || product.variantSku} | Stock: ${product.stock || product.currentStock} units</p>
              </div>
            `).join('') : '<p>No product details available</p>'}
          </div>
          <p>Please restock these items to avoid stockouts.</p>
        `,
        action: {
          text: 'Manage Inventory',
          url: `${process.env.WEBSITE_URL || 'http://localhost:9001'}/admin/inventory/low-stock`
        }
      }
    };

    return contents[type] || {
      title: 'Notification',
      message: 'Hello,',
      body: '<p>You have a new notification from Multitrade.</p>'
    };
  }

  static generateOrderItems(items) {
    if (!items || !Array.isArray(items)) return '';
    
    return `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 15px 0; color: #374151;">Order Items</h4>
        ${items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <div>
              <p style="margin: 0; font-weight: 600;">${item.productTitle || item.name || 'Product'}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Qty: ${item.qty || item.quantity || 1}</p>
              ${item.variantSku ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">SKU: ${item.variantSku}</p>` : ''}
            </div>
            <p style="margin: 0; font-weight: 600;">₹${(item.totalPrice || item.price || 0).toLocaleString()}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Convenience methods for common notifications
  static async sendWelcomeEmail(email, name) {
    return this.sendNotification('customer-welcome', email, { name });
  }

  static async sendPasswordResetEmail(email, name, otp, isAdmin = false) {
    const type = isAdmin ? 'admin-password-reset' : 'customer-password-reset';
    return this.sendNotification(type, email, { name, otp });
  }

  static async sendPasswordChangedEmail(email, name, isAdmin = false) {
    const type = isAdmin ? 'admin-password-changed' : 'customer-password-changed';
    return this.sendNotification(type, email, { name });
  }

  static async sendOrderConfirmation(email, orderData) {
    return this.sendNotification('order-confirmation', email, orderData);
  }

  static async sendOrderStatusUpdate(email, orderData, status) {
    const statusTypes = {
      'processing': 'order-processing',
      'shipped': 'order-shipped',
      'delivered': 'order-delivered',
      'cancelled': 'order-cancelled'
    };
    
    const notificationType = statusTypes[status] || 'order-confirmation';
    return this.sendNotification(notificationType, email, orderData);
  }

  static async sendLowStockAlert(adminEmail, products) {
    return this.sendNotification('low-stock-alert', adminEmail, { products });
  }
}

module.exports = NotificationService;