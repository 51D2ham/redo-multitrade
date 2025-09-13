# Multitrade E-commerce API Documentation

## Base URLs
- **Production**: https://redo-multitrade.onrender.com
- **Development**: http://localhost:9001

## Authentication
- **Customer APIs**: JWT token in `Authorization: Bearer <token>` header
- **Admin APIs**: Session-based authentication via login

---

## 🌐 Public APIs (No Authentication Required)

### Products

#### Get All Products
```http
GET /api/v1/products
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 50) - Items per page
- `category` (ObjectId) - Filter by category ID
- `brand` (ObjectId) - Filter by brand ID
- `subcategory` (ObjectId) - Filter by subcategory ID
- `type` (ObjectId) - Filter by type ID
- `search` (string) - Search in title, description, tags
- `sort` (string) - Sort options: `price_asc`, `price_desc`, `rating`, `newest`, `oldest`, `name_asc`, `name_desc`, `featured`
- `minPrice` / `maxPrice` (number) - Price range filter
- `featured` (boolean) - Filter featured products
- `stock` (string) - Stock filter: `instock`, `outofstock`
- `newArrivals` (boolean) - Products from last 30 days
- `discount` (boolean/number) - Filter discounted products or by discount percentage

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "title": "Product Name",
      "thumbnail": "/uploads/products/image.jpg",
      "price": 999,
      "originalPrice": 1299,
      "isOnSale": true,
      "discountPercent": 23,
      "rating": 4.5,
      "reviewCount": 25,
      "totalStock": 50,
      "featured": true,
      "category": { "_id": "cat_id", "name": "Electronics" },
      "brand": { "_id": "brand_id", "name": "Samsung" },
      "specs": [
        { "title": "RAM", "value": "8GB" },
        { "title": "Storage", "value": "256GB" }
      ]
    }
  ],
  "pagination": {
    "current": 1,
    "total": 5,
    "hasNext": true,
    "hasPrev": false,
    "totalProducts": 100
  }
}
```

#### Get Featured Products
```http
GET /api/v1/products/featured
```
Same parameters and response format as above, but only returns featured products sorted by `featuredRank`.

#### Get Product by ID/Slug
```http
GET /api/v1/products/:id
```
Returns detailed product information including specifications and reviews.

#### Get Product Filters
```http
GET /api/v1/products/filters
```
Returns available categories, brands, subcategories, and types for filtering.

### Categories & Parameters
```http
GET /api/v1/categories          # Get all categories
GET /api/v1/subcategories       # Get all subcategories
GET /api/v1/types              # Get all types
GET /api/v1/brands             # Get all brands
GET /api/v1/spec-lists         # Get specification lists
```

---

## 🔐 Customer APIs (JWT Authentication Required)

### Authentication

#### Register (Step 1: Send OTP)
```http
POST /api/v1/customers/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123",
  "fullname": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "action": "new_registration",
  "message": "OTP sent to your email. Valid for 10 minutes.",
  "canResend": true
}
```

#### Register (Step 2: Verify OTP)
```http
POST /api/v1/customers/verify-otp
Content-Type: application/json

{
  "email": "customer@example.com",
  "otp": "123456"
}
```

#### Resend OTP
```http
POST /api/v1/customers/resend-otp
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

#### Login
```http
POST /api/v1/customers/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "customer@example.com",
    "fullname": "John Doe"
  }
}
```

#### Forgot Password
```http
POST /api/v1/customers/forgot-password
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

#### Reset Password
```http
POST /api/v1/customers/reset-password
Content-Type: application/json

{
  "email": "customer@example.com",
  "otpCode": "123456",
  "newPassword": "newSecurePassword123"
}
```

### Profile Management

#### Get Current User
```http
GET /api/v1/customers/me
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /api/v1/customers/profile
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

fullname=John Doe Updated
phone=1234567890
gender=male
dob=1990-01-01
profileImage=<file>
```

#### Change Password
```http
PUT /api/v1/customers/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

#### Logout
```http
POST /api/v1/customers/logout
Authorization: Bearer <jwt_token>
```

### Cart Management

#### Get Cart
```http
GET /api/v1/cart
Authorization: Bearer <jwt_token>
```

#### Add to Cart
```http
POST /api/v1/cart
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": "product_id",
  "variantSku": "SKU123",
  "quantity": 2
}
```

#### Update Cart Item
```http
PUT /api/v1/cart/items/:itemId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### Remove Cart Item
```http
DELETE /api/v1/cart/items/:itemId
Authorization: Bearer <jwt_token>
```

#### Clear Cart
```http
DELETE /api/v1/cart
Authorization: Bearer <jwt_token>
```

### Wishlist Management

#### Get Wishlist
```http
GET /api/v1/wishlist
Authorization: Bearer <jwt_token>
```

#### Add to Wishlist
```http
POST /api/v1/wishlist
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": "product_id"
}
```

#### Remove from Wishlist
```http
DELETE /api/v1/wishlist/items/:itemId
Authorization: Bearer <jwt_token>
```

### Orders

#### Get User Orders
```http
GET /api/v1/orders
Authorization: Bearer <jwt_token>
```

#### Get Order by ID
```http
GET /api/v1/orders/:orderId
Authorization: Bearer <jwt_token>
```

#### Create Order
```http
POST /api/v1/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "1234567890",
    "address": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345",
    "country": "Country"
  },
  "paymentMethod": "cod",
  "items": [
    {
      "productId": "product_id",
      "variantSku": "SKU123",
      "quantity": 2,
      "price": 999
    }
  ]
}
```

### Reviews

#### Get Product Reviews
```http
GET /api/v1/reviews?productId=product_id
```

#### Add Review
```http
POST /api/v1/reviews
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": "product_id",
  "rating": 5,
  "comment": "Great product!"
}
```

---

## 👨💼 Admin APIs (Session Authentication Required)

### Authentication
```http
POST /admin/v1/staff/login      # Admin login
GET /admin/v1/staff/logout      # Admin logout
```

### Product Management
```http
GET /admin/v1/products                    # List products
GET /admin/v1/products/new                # New product form
POST /admin/v1/products                   # Create product
GET /admin/v1/products/:id                # Show product
GET /admin/v1/products/:id/edit           # Edit product form
PUT /admin/v1/products/:id                # Update product
DELETE /admin/v1/products/:id             # Delete product
```

### Bulk Upload
```http
GET /admin/v1/products/bulk-upload        # Upload form
POST /admin/v1/products/bulk-upload/upload # Process CSV upload
```

### Order Management
```http
GET /admin/v1/order                       # List orders
GET /admin/v1/order/:id                   # Order details
PUT /admin/v1/order/:id/status            # Update order status
```

### Inventory Management
```http
GET /admin/v1/inventory/dashboard         # Inventory dashboard
GET /admin/v1/inventory/low-stock         # Low stock alerts
GET /admin/v1/inventory/movements         # Stock movements
POST /admin/v1/inventory/restock          # Restock products
```

### Content Management
```http
GET /admin/v1/parameters/categories       # Manage categories
GET /admin/v1/parameters/brands           # Manage brands
GET /admin/v1/content/hero-carousel       # Manage hero carousel
GET /admin/v1/content/ads-panel           # Manage ads
```

### Reports & Analytics
```http
GET /admin/reports/comprehensive          # Main dashboard
GET /admin/reports/export                 # Export reports to Excel
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
    "hasPrev": false,
    "totalProducts": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    "Validation error details"
  ]
}
```

---

## 🔧 HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (Invalid/Missing Token)
- `403` - Forbidden (Insufficient Permissions)
- `404` - Not Found
- `409` - Conflict (Duplicate Resource)
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

---

## 📁 File Upload Specifications
- **Supported Formats**: JPG, JPEG, PNG, WEBP
- **Maximum Size**: 5MB per file
- **Maximum Files**: 10 files per upload
- **Storage Path**: `/uploads/products/` (for product images)
- **Access URL**: `https://domain.com/uploads/products/filename.jpg`

---

## 🔒 Security Features
- **Rate Limiting**: 3 OTP requests per hour per email
- **CSRF Protection**: All admin forms protected
- **Input Sanitization**: XSS protection on all inputs
- **JWT Expiration**: 7 days for customer tokens
- **Password Requirements**: Minimum 8 characters
- **File Upload Validation**: Type and size restrictions

---

## 🧪 Testing Examples

### Get Products with Filters
```bash
curl \"https://redo-multitrade.onrender.com/api/v1/products?category=CATEGORY_ID&sort=price_asc&limit=10&featured=true\"
```

### Customer Registration
```bash
curl -X POST \"https://redo-multitrade.onrender.com/api/v1/customers/register\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"fullname\":\"Test User\"}'
```

### Customer Login
```bash
curl -X POST \"https://redo-multitrade.onrender.com/api/v1/customers/login\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\"}'
```

### Add to Cart (with JWT)
```bash
curl -X POST \"https://redo-multitrade.onrender.com/api/v1/cart\" \\
  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"productId\":\"PRODUCT_ID\",\"variantSku\":\"SKU123\",\"quantity\":2}'
```

### Get Product Details
```bash
curl \"https://redo-multitrade.onrender.com/api/v1/products/PRODUCT_ID_OR_SLUG\"
```

---

## 🚀 Live Demo & Access

**Production API Base**: https://redo-multitrade.onrender.com/api/v1

**Admin Panel**: https://redo-multitrade.onrender.com/admin/v1/staff/login

**Analytics Dashboard**: https://redo-multitrade.onrender.com/admin/reports/comprehensive

---

## 📝 Notes

1. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters
2. **Search**: Product search works across title, description, and tags
3. **Filtering**: Multiple filters can be combined for precise results
4. **Sorting**: Products can be sorted by price, rating, date, name, and featured status
5. **Stock Management**: Real-time inventory tracking with low stock alerts
6. **Image Optimization**: Automatic image processing and compression
7. **SEO Friendly**: Products accessible via both ID and slug
8. **Mobile Responsive**: All admin interfaces are mobile-friendly

For detailed implementation examples and advanced usage, refer to the source code in the respective controller files.