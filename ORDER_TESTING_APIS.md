# 🧪 Order Management API Testing Guide

## 🔐 **Authentication Setup**

### **1. Customer Registration**
```http
POST http://localhost:9001/api/v1/customers/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "fullname": "Test User",
  "phone": "+1234567890",
  "password": "password123",
  "gender": "male",
  "dob": "1990-01-01",
  "permanentAddress": "123 Main St",
  "tempAddress": "123 Main St"
}
```

### **2. Customer Login**
```http
POST http://localhost:9001/api/v1/customers/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```
**Response:** Save the `accessToken` for subsequent requests

---

## 🛒 **Cart & Checkout Flow**

### **3. Add Items to Cart**
```http
POST http://localhost:9001/api/v1/cart/
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "PRODUCT_ID_HERE",
  "quantity": 2
}
```

### **4. Get Cart Items**
```http
GET http://localhost:9001/api/v1/cart/
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### **5. Checkout Order**
```http
POST http://localhost:9001/api/v1/orders/checkout
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "paymentMethod": "cod",
  "useNewAddress": true,
  "shippingAddress": {
    "fullname": "Test User",
    "street": "123 Test Street",
    "city": "Test City",
    "state": "Test State",
    "postalCode": "12345",
    "country": "Test Country",
    "phone": "+1234567890"
  }
}
```
**Response:** Save the `orderId` for testing

---

## 📋 **Order Management APIs**

### **6. Get Customer Order History**
```http
GET http://localhost:9001/api/v1/orders/order-history
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### **7. Get Single Order Details (Customer)**
```http
GET http://localhost:9001/api/v1/orders/ORDER_ID_HERE
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### **8. Cancel Order (Customer)**
```http
POST http://localhost:9001/api/v1/orders/ORDER_ID_HERE/cancel
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{}
```

---

## 👨‍💼 **Admin Order Management**

### **9. Admin Login (Browser/Postman)**
```http
POST http://localhost:9001/admin/v1/staff/login
Content-Type: application/x-www-form-urlencoded

email=admin@example.com&password=admin123
```

### **10. Get All Orders (Admin)**
```http
GET http://localhost:9001/admin/v1/order
Cookie: ecom.sid=SESSION_COOKIE_VALUE
```

### **11. Get Order Details (Admin)**
```http
GET http://localhost:9001/admin/v1/order/ORDER_ID_HERE
Cookie: ecom.sid=SESSION_COOKIE_VALUE
```

### **12. Update Order Status (Admin - PATCH)**
```http
PATCH http://localhost:9001/admin/v1/order/ORDER_ID_HERE/status
Cookie: ecom.sid=SESSION_COOKIE_VALUE
Content-Type: application/json

{
  "status": "processing",
  "statusMessage": "Your order is being processed"
}
```

### **13. Update Order Status (Admin - PUT Form)**
```http
PUT http://localhost:9001/admin/v1/order/ORDER_ID_HERE
Cookie: ecom.sid=SESSION_COOKIE_VALUE
Content-Type: application/x-www-form-urlencoded

status=shipped&trackingNumber=TRK123456&statusMessage=Your order has been shipped
```

### **14. Update Payment Status (Admin)**
```http
PATCH http://localhost:9001/admin/v1/order/ORDER_ID_HERE/payment
Cookie: ecom.sid=SESSION_COOKIE_VALUE
Content-Type: application/json

{
  "paid": true
}
```

---

## 🧪 **Stock Management Testing**

### **15. Check Product Stock Before Order**
```http
GET http://localhost:9001/api/v1/products/PRODUCT_ID_HERE
```
**Note:** Check `variants[].qty` values

### **16. Place Order & Check Stock Reduction**
1. Note initial stock from step 15
2. Place order using step 5
3. Check product again - stock should be reduced

### **17. Cancel Order & Check Stock Restoration**
1. Cancel order using step 8 or 12 (with status="cancelled")
2. Check product stock again - should be restored to original

---

## 📊 **Testing Scenarios**

### **Scenario 1: Customer Order Lifecycle**
```bash
1. Register customer → Login → Add to cart → Checkout
2. Check stock reduction after checkout
3. Cancel order as customer
4. Verify stock restoration
```

### **Scenario 2: Admin Order Management**
```bash
1. Place order as customer
2. Login as admin → View order
3. Update status: pending → processing → shipped → delivered
4. Verify email notifications (check logs)
```

### **Scenario 3: Stock Restoration Testing**
```bash
1. Place order (stock reduces)
2. Admin cancels order (stock restores)
3. Verify inventory logs show both movements
```

### **Scenario 4: Error Handling**
```bash
1. Try to cancel delivered order (should fail)
2. Try invalid status transitions (should fail)
3. Try to cancel already cancelled order (should fail)
```

---

## 🔍 **Status Transition Testing**

### **Valid Transitions:**
```http
# Pending → Processing
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "processing"}

# Processing → Shipped
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "shipped"}

# Shipped → Delivered
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "delivered"}

# Any → Cancelled (except delivered)
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "cancelled"}
```

### **Invalid Transitions (Should Fail):**
```http
# Delivered → Any other status
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "processing"}

# Cancelled → Any other status
PATCH http://localhost:9001/admin/v1/order/ORDER_ID/status
{"status": "shipped"}
```

---

## 📝 **Expected Responses**

### **Successful Order Cancellation:**
```json
{
  "success": true,
  "message": "Order cancelled and items restocked",
  "data": {
    "orderId": "ORDER_ID",
    "status": "cancelled"
  }
}
```

### **Successful Status Update:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "orderId": "ORDER_ID",
    "status": "processing",
    "trackingNumber": null,
    "estimatedDelivery": null
  }
}
```

### **Error Response:**
```json
{
  "success": false,
  "message": "Cannot change status from delivered to processing"
}
```

---

## 🛠️ **Testing Tools**

### **Postman Collection:**
Import the existing `POSTMAN_API_COLLECTION.json` file and add these endpoints.

### **cURL Examples:**
```bash
# Customer login
curl -X POST http://localhost:9001/api/v1/customers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Cancel order
curl -X POST http://localhost:9001/api/v1/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ✅ **Verification Checklist**

- [ ] Customer can place orders
- [ ] Stock reduces after checkout
- [ ] Customer can cancel orders
- [ ] Admin can update order status
- [ ] Stock restores after cancellation
- [ ] Invalid status transitions are blocked
- [ ] Email notifications are sent
- [ ] Inventory logs are created
- [ ] Error handling works properly
- [ ] Payment status updates correctly

**Test all scenarios to ensure the order management system works perfectly!** 🎯