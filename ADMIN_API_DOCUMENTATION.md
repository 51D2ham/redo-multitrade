# 🔧 Multitrade Backend - Admin API Documentation

## 🌐 Base URL
```
http://localhost:9001
```

## 🔐 Admin Authentication
Admin endpoints require session-based authentication. Login through the admin panel to access these endpoints.

---

## 👨‍💼 Admin Authentication & Management

### 1. Admin Login
**GET** `/admin/v1/staff/login` - Login page
**POST** `/admin/v1/staff/login` - Login submission

**Request Body:**
```json
{
  "email": "admin@multitrade.com",
  "password": "AdminPass123"
}
```

### 2. Admin Registration
**GET** `/admin/v1/staff/register` - Registration page
**POST** `/admin/v1/staff/register` - Registration submission

**Request Body (multipart/form-data):**
```json
{
  "username": "admin_user",
  "email": "admin@multitrade.com",
  "fullname": "Admin User",
  "phone": "+9779841234567",
  "password": "AdminPass123",
  "gender": "male",
  "dob": "1985-01-15",
  "permanentAddress": "Kathmandu, Nepal",
  "tempAddress": "Lalitpur, Nepal",
  "role": "admin",
  "photo": "file" // Optional file upload
}
```

### 3. Admin Dashboard
**GET** `/admin/v1/staff/dashboard` - Main admin dashboard
**GET** `/admin/v1/staff/parameter-dashboard` - Parameters management dashboard
**GET** `/admin/v1/staff/content` - Content management dashboard

### 4. Password Management
**GET** `/admin/v1/staff/forgot-password` - Forgot password page
**POST** `/admin/v1/staff/forgot-password` - Send reset OTP
**GET** `/admin/v1/staff/reset-password` - Reset password page
**POST** `/admin/v1/staff/reset-password` - Reset password submission
**GET** `/admin/v1/staff/change-password` - Change password page
**POST** `/admin/v1/staff/change-password` - Change password submission

---

## 📦 Product Management

### 1. Product List & Management
**GET** `/admin/v1/products/` - Products list page
**GET** `/admin/v1/products/new` - Add new product page
**POST** `/admin/v1/products/` - Create new product
**GET** `/admin/v1/products/:id` - Product details page
**GET** `/admin/v1/products/:id/edit` - Edit product page
**PUT** `/admin/v1/products/:id` - Update product
**DELETE** `/admin/v1/products/:id` - Delete product

### 2. Bulk Product Upload
**GET** `/admin/v1/products/bulk-upload` - Bulk upload page
**POST** `/admin/v1/products/bulk-upload` - Process bulk upload
**GET** `/admin/v1/products/bulk-upload/template` - Download CSV template
**GET** `/admin/v1/products/bulk-upload/sample` - Download sample data

**Request Body (multipart/form-data):**
```json
{
  "csvFile": "file", // CSV file with product data
  "uploadMode": "create", // create or update
  "validateOnly": false // true to validate without importing
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upload completed: 15 variants processed, 2 errors",
  "stats": {
    "total": 17,
    "success": 15,
    "errors": 2,
    "products": 5,
    "validateOnly": false
  },
  "results": [
    {
      "row": 1,
      "success": true,
      "product": {
        "title": "iPhone 15 Pro",
        "sku": "APPLE-IP15P-128-NT"
      }
    }
  ],
  "errors": [
    {
      "row": 3,
      "error": "SKU already exists",
      "data": {
        "title": "Duplicate Product",
        "sku": "EXISTING-SKU"
      }
    }
  ]
}
```

---

## 📂 Category Management

### 1. Categories
**GET** `/admin/v1/parameters/categories/` - Categories list
**GET** `/admin/v1/parameters/categories/new` - Add category page
**POST** `/admin/v1/parameters/categories/` - Create category
**GET** `/admin/v1/parameters/categories/:id/edit` - Edit category page
**PUT** `/admin/v1/parameters/categories/:id` - Update category
**DELETE** `/admin/v1/parameters/categories/:id` - Delete category

### 2. Subcategories
**GET** `/admin/v1/parameters/subcategories/` - Subcategories list
**GET** `/admin/v1/parameters/subcategories/new` - Add subcategory page
**POST** `/admin/v1/parameters/subcategories/` - Create subcategory
**GET** `/admin/v1/parameters/subcategories/:id/edit` - Edit subcategory page
**PUT** `/admin/v1/parameters/subcategories/:id` - Update subcategory
**DELETE** `/admin/v1/parameters/subcategories/:id` - Delete subcategory

### 3. Types
**GET** `/admin/v1/parameters/types/` - Types list
**GET** `/admin/v1/parameters/types/new` - Add type page
**POST** `/admin/v1/parameters/types/` - Create type
**GET** `/admin/v1/parameters/types/:id/edit` - Edit type page
**PUT** `/admin/v1/parameters/types/:id` - Update type
**DELETE** `/admin/v1/parameters/types/:id` - Delete type

### 4. Brands
**GET** `/admin/v1/parameters/brands/` - Brands list
**GET** `/admin/v1/parameters/brands/new` - Add brand page
**POST** `/admin/v1/parameters/brands/` - Create brand
**GET** `/admin/v1/parameters/brands/:id/edit` - Edit brand page
**PUT** `/admin/v1/parameters/brands/:id` - Update brand
**DELETE** `/admin/v1/parameters/brands/:id` - Delete brand

---

## 📋 Specification Lists Management

### 1. Spec Lists
**GET** `/admin/v1/parameters/spec-lists/` - Spec lists page
**GET** `/admin/v1/parameters/spec-lists/new` - Add spec list page
**POST** `/admin/v1/parameters/spec-lists/` - Create spec list
**GET** `/admin/v1/parameters/spec-lists/:id/edit` - Edit spec list page
**PUT** `/admin/v1/parameters/spec-lists/:id` - Update spec list
**DELETE** `/admin/v1/parameters/spec-lists/:id` - Delete spec list

**Request Body:**
```json
{
  "title": "Battery Life",
  "value": "30 hours",
  "status": "active",
  "category": "category_id",
  "subCategory": "subcategory_id",
  "type": "type_id",
  "brand": "brand_id"
}
```

---

## 🛒 Order Management

### 1. Order List & Management
**GET** `/admin/v1/order/` - Orders list page
**GET** `/admin/v1/order/:id` - Order details page
**GET** `/admin/v1/order/:id/edit` - Edit order page
**PUT** `/admin/v1/order/:id` - Update order
**PATCH** `/admin/v1/order/:id/status` - Update order status

**Status Update Request:**
```json
{
  "status": "processing", // pending, processing, shipped, delivered, cancelled
  "statusTitle": "Order Processing",
  "message": "Your order is being processed"
}
```

---

## 👥 Customer Management

### 1. Customer List & Management
**GET** `/admin/v1/customers/` - Customers list page
**GET** `/admin/v1/customers/users/:id` - Customer profile page
**GET** `/admin/v1/customers/users/:id/edit` - Edit customer page
**POST** `/admin/v1/customers/users/:id/update` - Update customer
**POST** `/admin/v1/customers/users/:id/delete` - Delete customer

---

## ⭐ Review Management

### 1. Review List & Management
**GET** `/admin/v1/reviews/` - Reviews list page
**GET** `/admin/v1/reviews/:id` - Review details page
**DELETE** `/admin/v1/reviews/:id` - Delete review

---

## 🎠 Hero Carousel Management

### 1. Hero Carousel
**GET** `/admin/v1/parameters/hero-carousel/` - Carousel items list
**GET** `/admin/v1/parameters/hero-carousel/new` - Add carousel item page
**POST** `/admin/v1/parameters/hero-carousel/` - Create carousel item
**GET** `/admin/v1/parameters/hero-carousel/:id/edit` - Edit carousel item page
**PUT** `/admin/v1/parameters/hero-carousel/:id` - Update carousel item
**DELETE** `/admin/v1/parameters/hero-carousel/:id` - Delete carousel item

**Request Body (multipart/form-data):**
```json
{
  "title": "Summer Sale",
  "image": "file", // Image file upload
  "link": "/products?category=electronics",
  "status": "active"
}
```

---

## 📢 Ads Panel Management

### 1. Ads Panel
**GET** `/admin/v1/parameters/ads-panel/` - Ads list
**GET** `/admin/v1/parameters/ads-panel/new` - Add ad page
**POST** `/admin/v1/parameters/ads-panel/` - Create ad
**GET** `/admin/v1/parameters/ads-panel/:id/edit` - Edit ad page
**PUT** `/admin/v1/parameters/ads-panel/:id` - Update ad
**DELETE** `/admin/v1/parameters/ads-panel/:id` - Delete ad

**Request Body (multipart/form-data):**
```json
{
  "title": "Special Offer",
  "image": "file", // Image file upload
  "locationId": "homepage", // homepage, sidebar, footer, etc.
  "link": "/products/special-offers"
}
```

---

## 🏢 Company Information Management

### 1. Company Info
**GET** `/admin/v1/parameters/company-info/` - Company info list
**GET** `/admin/v1/parameters/company-info/new` - Add company info page
**POST** `/admin/v1/parameters/company-info/` - Create company info
**GET** `/admin/v1/parameters/company-info/:id/edit` - Edit company info page
**PUT** `/admin/v1/parameters/company-info/:id` - Update company info
**DELETE** `/admin/v1/parameters/company-info/:id` - Delete company info

**Request Body (multipart/form-data):**
```json
{
  "companyName": "Multitrade",
  "email": "info@multitrade.com",
  "phone": "+977-1-4567890",
  "address": "Kathmandu, Nepal",
  "description": "Leading e-commerce platform",
  "website": "https://multitrade.com",
  "logo": "file", // Logo file upload
  "socialMedia": {
    "facebook": "https://facebook.com/multitrade",
    "instagram": "https://instagram.com/multitrade",
    "twitter": "https://twitter.com/multitrade",
    "linkedin": "https://linkedin.com/company/multitrade"
  },
  "businessHours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 4:00 PM",
    "sunday": "Closed"
  }
}
```

---

## 📊 Inventory Management

### 1. Inventory Dashboard
**GET** `/admin/inventory/dashboard` - Inventory overview dashboard
**GET** `/admin/inventory/low-stock` - Low stock alerts page
**GET** `/admin/inventory/movements` - Inventory movements log

---

## 📈 Reports & Analytics

### 1. Comprehensive Dashboard
**GET** `/admin/reports/comprehensive` - Main analytics dashboard

### 2. Sales Reports
**GET** `/admin/reports/sales` - Sales reports page
**GET** `/admin/reports/export/excel` - Export sales data to Excel
**GET** `/admin/reports/export/csv` - Export sales data to CSV

---

## 🔧 Admin API Endpoints (JSON)

### 1. Order Management APIs

#### Update Individual Order Item
**PATCH** `/api/v1/orders/admin/:id/items/:itemIndex`
**Requires:** Admin Authentication

**Request Body:**
```json
{
  "status": "shipped",
  "statusMessage": "Item shipped via courier",
  "sendEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item status updated successfully",
  "item": {
    "index": 0,
    "status": "shipped",
    "statusMessage": "Item shipped via courier",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

#### Bulk Update Order Items
**PATCH** `/api/v1/orders/admin/:id/items`
**Requires:** Admin Authentication

**Request Body:**
```json
{
  "items": [
    {
      "index": 0,
      "status": "shipped"
    },
    {
      "index": 1,
      "status": "processing"
    }
  ],
  "sendEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 items updated successfully",
  "updatedItems": [
    {
      "index": 0,
      "status": "shipped"
    },
    {
      "index": 1,
      "status": "processing"
    }
  ]
}
```

### 2. Inventory Management APIs

#### Get Low Stock Items
**GET** `/api/v1/inventory/low-stock`
**Requires:** Admin Authentication

**Response:**
```json
{
  "success": true,
  "lowStockItems": [
    {
      "productId": "product_id",
      "title": "Product Name",
      "sku": "SKU123",
      "currentStock": 3,
      "thresholdQty": 5,
      "status": "low_stock"
    }
  ]
}
```

#### Get Inventory Movements
**GET** `/api/v1/inventory/movements`
**Requires:** Admin Authentication

**Response:**
```json
{
  "success": true,
  "movements": [
    {
      "_id": "movement_id",
      "product": {
        "title": "Product Name"
      },
      "variantSku": "SKU123",
      "type": "sale",
      "quantity": -2,
      "previousStock": 10,
      "newStock": 8,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Reports & Analytics APIs

#### Get Comprehensive Dashboard Data
**GET** `/admin/api/reports/comprehensive`
**Requires:** Admin Authentication

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "summary": {
      "totalRevenue": 125000,
      "totalOrders": 450,
      "totalCustomers": 120,
      "totalProducts": 85
    },
    "salesTrend": [
      {
        "date": "2025-01-01",
        "revenue": 5000,
        "orders": 25
      }
    ]
  }
}
```

#### Export Dashboard Data
**GET** `/admin/reports/comprehensive/excel` - Excel export
**GET** `/admin/reports/comprehensive/csv` - CSV export
**Requires:** Admin Authentication

---

## 🔐 Role-Based Access Control

### Admin Roles:
- **admin**: Basic admin access
- **superadmin**: Full admin access
- **developer**: Development access (highest level)

### Protected Routes:
- User management: `superadmin`, `developer`
- Admin management: `superadmin`, `developer`
- System settings: `developer`
- Password changes: `superadmin`, `developer`

---

## 📝 Form Validation

### Common Validation Rules:
- **Email**: Valid email format, unique
- **Phone**: Valid phone format, unique
- **Username**: Alphanumeric, unique, 3-20 characters
- **Password**: Minimum 8 characters, mixed case, numbers
- **Images**: JPG, PNG, WEBP formats, max 5MB
- **Required Fields**: Cannot be empty or null

---

## 🚨 Error Handling

### Common Error Responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Field validation error"]
}
```

### HTTP Status Codes:
- `200` - Success
- `302` - Redirect (for form submissions)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient role)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📁 File Upload Specifications

### Image Upload:
- **Formats**: JPG, JPEG, PNG, WEBP
- **Max Size**: 5MB per file
- **Storage**: `/src/uploads/` directory
- **Naming**: Timestamp + random number + original extension

### CSV Upload (Bulk Products):
- **Format**: CSV with specific headers
- **Max Size**: 10MB
- **Required Columns**: title, description, price, etc.
- **Sample Template**: Available at `/sample_data/product_upload_template.csv`

---

## 🔄 Session Management

### Session Configuration:
- **Name**: `multitrade.sid`
- **Duration**: 24 hours
- **Storage**: MongoDB (connect-mongo)
- **Security**: HttpOnly, Secure (production), SameSite

### Session Data:
```json
{
  "admin": {
    "id": "admin_id",
    "username": "admin_user",
    "email": "admin@multitrade.com",
    "fullname": "Admin User",
    "role": "admin"
  }
}
```

---

## 📋 Complete Admin Endpoint Summary

### **Admin Authentication**
- `GET /admin/v1/staff/login` - Login page
- `POST /admin/v1/staff/login` - Login submission
- `GET /admin/v1/staff/register` - Registration page
- `POST /admin/v1/staff/register` - Registration submission
- `GET /admin/v1/staff/dashboard` - Main dashboard
- `GET /admin/v1/staff/parameter-dashboard` - Parameters dashboard
- `GET /admin/v1/staff/content` - Content dashboard
- `POST /admin/v1/staff/forgot-password` - Password reset
- `POST /admin/v1/staff/change-password` - Change password

### **Product Management**
- `GET /admin/v1/products/` - Products list
- `GET /admin/v1/products/new` - Add product page
- `POST /admin/v1/products/` - Create product
- `GET /admin/v1/products/:id` - Product details
- `GET /admin/v1/products/:id/edit` - Edit product page
- `PUT /admin/v1/products/:id` - Update product
- `DELETE /admin/v1/products/:id` - Delete product

### **Bulk Upload**
- `GET /admin/v1/products/bulk-upload` - Bulk upload page
- `POST /admin/v1/products/bulk-upload` - Process upload
- `GET /admin/v1/products/bulk-upload/template` - Download template
- `GET /admin/v1/products/bulk-upload/sample` - Download sample

### **Category Management**
- `GET /admin/v1/parameters/categories/` - Categories list
- `POST /admin/v1/parameters/categories/` - Create category
- `PUT /admin/v1/parameters/categories/:id` - Update category
- `DELETE /admin/v1/parameters/categories/:id` - Delete category
- `GET /admin/v1/parameters/subcategories/` - Subcategories list
- `POST /admin/v1/parameters/subcategories/` - Create subcategory
- `GET /admin/v1/parameters/types/` - Types list
- `POST /admin/v1/parameters/types/` - Create type
- `GET /admin/v1/parameters/brands/` - Brands list
- `POST /admin/v1/parameters/brands/` - Create brand

### **Order Management**
- `GET /admin/v1/order/` - Orders list
- `GET /admin/v1/order/:id` - Order details
- `GET /admin/v1/order/:id/edit` - Edit order page
- `PUT /admin/v1/order/:id` - Update order
- `PATCH /admin/v1/order/:id/status` - Update order status

### **Advanced Order APIs**
- `PATCH /api/v1/orders/admin/:id/items/:itemIndex` - Update item
- `PATCH /api/v1/orders/admin/:id/items` - Bulk update items
- `GET /api/v1/orders/admin/:id/items/:itemIndex/history` - Item history

### **Customer Management**
- `GET /admin/v1/customers/` - Customers list
- `GET /admin/v1/customers/users/:id` - Customer profile
- `GET /admin/v1/customers/users/:id/edit` - Edit customer
- `POST /admin/v1/customers/users/:id/update` - Update customer
- `POST /admin/v1/customers/users/:id/delete` - Delete customer

### **Review Management**
- `GET /admin/v1/reviews/` - Reviews list
- `GET /admin/v1/reviews/:id` - Review details
- `DELETE /admin/v1/reviews/:id` - Delete review

### **Content Management**
- `GET /admin/v1/parameters/hero-carousel/` - Carousel management
- `POST /admin/v1/parameters/hero-carousel/` - Create carousel item
- `GET /admin/v1/parameters/ads-panel/` - Ads management
- `POST /admin/v1/parameters/ads-panel/` - Create ad
- `GET /admin/v1/parameters/company-info/` - Company info
- `POST /admin/v1/parameters/company-info/` - Update company info
- `GET /admin/v1/parameters/spec-lists/` - Specifications
- `POST /admin/v1/parameters/spec-lists/` - Create specification

### **Inventory Management**
- `GET /admin/inventory/dashboard` - Inventory dashboard
- `GET /admin/inventory/low-stock` - Low stock page
- `GET /admin/inventory/movements` - Inventory movements
- `GET /api/v1/inventory/low-stock` - Low stock API
- `GET /api/v1/inventory/movements` - Movements API
- `POST /api/v1/inventory/update-global-threshold` - Update threshold

### **Reports & Analytics**
- `GET /admin/reports/comprehensive` - Main dashboard
- `GET /admin/api/reports/comprehensive` - Dashboard API
- `GET /admin/reports/comprehensive/excel` - Excel export
- `GET /admin/reports/comprehensive/csv` - CSV export

## 🚀 Getting Started (Admin)

1. **Access Admin Panel**: `http://localhost:9001/admin/v1/staff/login`
2. **Login** with admin credentials
3. **Navigate** to different management sections
4. **Manage** products, orders, customers, and content
5. **View Reports** and analytics

---

## 📞 Admin Support

For admin panel support:
- **Email**: admin@multitrade.com
- **Internal Documentation**: Available in admin dashboard
- **Role Requests**: Contact system administrator

---

*Last Updated: January 2025*