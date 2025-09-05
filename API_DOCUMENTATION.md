# Multitrade API Documentation

## Base URLs
- **Production**: https://redo-multitrade.onrender.com
- **Development**: http://localhost:9001

## Authentication
- **Customer APIs**: JWT token in Authorization header
- **Admin APIs**: Session-based authentication

---

## 🌐 Public APIs (No Authentication)

### Products
```http
GET /api/v1/products                    # Get all products with filters
GET /api/v1/products/:id                # Get product by ID
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 50)
- `category` - Category ObjectId
- `brand` - Brand ObjectId
- `search` - Search term
- `sort` - price_asc, price_desc, rating, newest
- `minPrice` / `maxPrice` - Price range
- `featured` - true/false

### Categories & Filters
```http
GET /api/v1/categories                  # Get all categories
GET /api/v1/brands                      # Get all brands
GET /api/v1/subcategories              # Get all subcategories
GET /api/v1/types                      # Get all types
```

---

## 🔐 Customer APIs (JWT Required)

### Authentication
```http
POST /api/v1/customers/register/send-otp
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

```http
POST /api/v1/customers/register/verify-otp
Content-Type: application/json

{
  "email": "customer@example.com",
  "otp": "123456",
  "username": "customer123",
  "fullname": "John Doe",
  "phone": "1234567890",
  "password": "securePassword123"
}
```

```http
POST /api/v1/customers/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123"
}
```

### Cart Management
```http
GET /api/v1/cart                        # Get cart
POST /api/v1/cart/items                 # Add to cart
PUT /api/v1/cart/items/:itemId          # Update cart item
DELETE /api/v1/cart/items/:itemId       # Remove cart item
DELETE /api/v1/cart                     # Clear cart
```

### Wishlist Management
```http
GET /api/v1/wishlist                    # Get wishlist
POST /api/v1/wishlist/items             # Add to wishlist
DELETE /api/v1/wishlist/items/:itemId   # Remove from wishlist
```

### Orders
```http
GET /api/v1/orders                      # Get user orders
GET /api/v1/orders/:orderId             # Get order by ID
POST /api/v1/orders                     # Create new order
```

---

## 👨💼 Admin APIs (Session Required)

### Product Management
```http
GET /admin/v1/products                  # List products
POST /admin/v1/products                 # Create product
PUT /admin/v1/products/:id              # Update product
DELETE /admin/v1/products/:id           # Delete product
```

### Bulk Upload
```http
POST /admin/v1/products/bulk-upload/upload
Content-Type: multipart/form-data

file: products.csv
uploadMode: create|update
```

### Inventory Management
```http
GET /admin/v1/inventory/low-stock       # Get low stock alerts
GET /admin/v1/inventory/restock         # Show restock form
POST /admin/v1/inventory/restock        # Restock products
GET /admin/v1/inventory/movements       # Inventory movements
```

### Order Management
```http
GET /admin/v1/order                     # List all orders
GET /admin/v1/order/:id                 # Get order details
PUT /admin/v1/order/:id/status          # Update order status
```

### Reports & Analytics
```http
GET /admin/reports/comprehensive        # Main dashboard
GET /admin/reports/export               # Export reports
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "pagination": {
    "current": 1,
    "total": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors
  ]
}
```

---

## 🔧 Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📁 File Upload
- **Formats**: JPG, JPEG, PNG, WEBP
- **Max Size**: 5MB per file
- **Path**: `/uploads/`

---

## 🧪 Testing Examples

### Get Products with Filters
```bash
curl "https://redo-multitrade.onrender.com/api/v1/products?category=CATEGORY_ID&sort=price_asc&limit=10"
```

### Customer Login
```bash
curl -X POST "https://redo-multitrade.onrender.com/api/v1/customers/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Add to Cart (with JWT)
```bash
curl -X POST "https://redo-multitrade.onrender.com/api/v1/cart/items" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","variantSku":"SKU","quantity":2}'
```

---

## 🚀 Live Demo
**Production API**: https://redo-multitrade.onrender.com/api/v1

**Admin Panel**: https://redo-multitrade.onrender.com/admin/v1/staff/login

**Dashboard**: https://redo-multitrade.onrender.com/admin/reports/comprehensive