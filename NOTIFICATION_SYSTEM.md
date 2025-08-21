# 📧 Notification System Documentation

## Overview
The NotificationService provides a unified email notification system with modern HTML templates for all authentication, order, and admin notifications across the Multitrade platform.

## Features
- **Modern HTML Templates**: Professional gradient design with responsive layout
- **Unified Service**: Single service for all notification types
- **Template Engine**: Dynamic content generation with data binding
- **Email Types**: Authentication, orders, inventory alerts, admin notifications
- **Error Handling**: Comprehensive error handling and logging

## Usage

### Basic Usage
```javascript
const NotificationService = require('../services/notificationService');

// Send any notification
await NotificationService.sendNotification('customer-welcome', email, { name: 'John' });
```

### Convenience Methods
```javascript
// Welcome email
await NotificationService.sendWelcomeEmail(email, name);

// Password reset
await NotificationService.sendPasswordResetEmail(email, name, otp, isAdmin);

// Password changed
await NotificationService.sendPasswordChangedEmail(email, name, isAdmin);

// Order confirmation
await NotificationService.sendOrderConfirmation(email, orderData);

// Order status updates
await NotificationService.sendOrderStatusUpdate(email, orderData, 'shipped');

// Low stock alerts
await NotificationService.sendLowStockAlert(adminEmail, products);
```

## Supported Notification Types

### Authentication
- `customer-welcome` - Welcome new customers
- `customer-password-reset` - Password reset with OTP
- `customer-password-changed` - Password change confirmation
- `admin-password-reset` - Admin password reset
- `admin-password-changed` - Admin password change confirmation

### Orders
- `order-confirmation` - Order placement confirmation
- `order-processing` - Order processing notification
- `order-shipped` - Shipping notification with tracking
- `order-delivered` - Delivery confirmation
- `order-cancelled` - Cancellation notification

### Inventory
- `low-stock-alert` - Low stock warnings for admins

## Data Parameters

### Customer Welcome
```javascript
{
  name: 'Customer Name'
}
```

### Password Reset
```javascript
{
  name: 'User Name',
  otp: '123456'
}
```

### Order Notifications
```javascript
{
  customerName: 'Customer Name',
  orderNumber: 'ORD-12345',
  orderId: 'objectId',
  orderDate: '2025-01-01',
  totalAmount: 1500,
  itemCount: 3,
  paymentMethod: 'COD',
  items: [
    {
      productTitle: 'Product Name',
      qty: 2,
      totalPrice: 1000,
      variantSku: 'SKU123'
    }
  ],
  trackingNumber: 'TRK123456',
  estimatedDelivery: '3-5 days'
}
```

### Low Stock Alert
```javascript
{
  products: [
    {
      name: 'Product Name',
      sku: 'SKU123',
      stock: 5
    }
  ]
}
```

## Template Features

### Base Template
- **Responsive Design**: Mobile-first approach
- **Modern Styling**: Gradient headers, rounded corners
- **Professional Layout**: Clean typography and spacing
- **Brand Consistency**: Multitrade branding throughout

### Content Boxes
- **Info Box**: Blue theme for general information
- **Success Box**: Green theme for confirmations
- **Warning Box**: Yellow theme for alerts
- **Error Box**: Red theme for errors
- **OTP Box**: Special styling for verification codes

### Email Structure
```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Responsive meta tags and styles -->
  </head>
  <body>
    <div class="container">
      <div class="header">
        <!-- Company logo and title -->
      </div>
      <div class="content">
        <!-- Dynamic content -->
        <!-- Action buttons -->
      </div>
      <div class="footer">
        <!-- Support info and copyright -->
      </div>
    </div>
  </body>
</html>
```

## Integration Examples

### Customer Registration
```javascript
// In customerRegister.js
const result = await NotificationService.sendWelcomeEmail(
  user.email, 
  user.name
);
```

### Order Checkout
```javascript
// In checkoutController.js
await NotificationService.sendOrderConfirmation(user.email, {
  customerName: user.name,
  orderNumber: order.orderNumber,
  orderId: order._id,
  totalAmount: order.totalPrice,
  itemCount: order.totalItem,
  items: order.items
});
```

### Admin Password Reset
```javascript
// In adminRegister.js
await NotificationService.sendPasswordResetEmail(
  admin.email,
  admin.name,
  otp,
  true // isAdmin flag
);
```

## Error Handling
```javascript
const result = await NotificationService.sendNotification(type, email, data);

if (result.success) {
  console.log('Email sent successfully');
} else {
  console.error('Failed to send email:', result.error);
}
```

## Environment Variables
```env
SUPPORT_EMAIL=support@multitrade.com
WEBSITE_URL=http://localhost:9001
```

## File Structure
```
src/
├── services/
│   └── notificationService.js     # Main notification service
├── utils/
│   ├── orderNotification.js       # Order notification wrapper
│   └── emailStatusUpdate.js       # Status update wrapper
└── controllers/
    ├── customerRegister.js        # Customer auth integration
    ├── adminRegister.js           # Admin auth integration
    └── checkoutController.js      # Order integration
```

## Migration from Old System
The new NotificationService replaces multiple email utilities:
- Old `orderNotification.js` → Now uses NotificationService
- Old `emailStatusUpdate.js` → Now uses NotificationService
- Scattered email logic → Centralized in NotificationService

## Best Practices
1. **Use convenience methods** for common notifications
2. **Provide all required data** for proper template rendering
3. **Handle errors gracefully** with fallback mechanisms
4. **Log notification results** for debugging
5. **Test email templates** across different clients