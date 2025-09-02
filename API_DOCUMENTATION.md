# Multitrade API Documentation

## Base URL
```
http://localhost:9001
```

## Authentication
- **Customer APIs**: Require JWT token in Authorization header
- **Admin APIs**: Require admin session authentication

---

## Public APIs (No Authentication Required)

### Products
- `GET /api/v1/products` - Get all products with filters
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/slug/:slug` - Get product by slug

### Categories
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get category by ID

### Subcategories
- `GET /api/v1/subcategories` - Get all subcategories
- `GET /api/v1/subcategories/:id` - Get subcategory by ID

### Types
- `GET /api/v1/types` - Get all types
- `GET /api/v1/types/:id` - Get type by ID

### Brands
- `GET /api/v1/brands` - Get all brands
- `GET /api/v1/brands/:id` - Get brand by ID

### Content Management
- `GET /api/v1/hero-carousel` - Get hero carousel items
- `GET /api/v1/ads-panel` - Get advertisement panels
- `GET /api/v1/company-info` - Get company information
- `GET /api/v1/parameter-posters` - Get parameter posters
- `GET /api/v1/brand-carousel` - Get brand carousel items

### Reviews
- `GET /api/v1/reviews/product/:productId` - Get product reviews

---

## Customer APIs (Authentication Required)

### Authentication
#### Register OTP
```http
POST /api/v1/customers/register/send-otp
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

#### Verify OTP & Register
```http
POST /api/v1/customers/register/verify-otp
Content-Type: application/json

{
  "email": "customer@example.com",
  "otp": "123456",
  "username": "customer123",
  "fullname": "John Doe",
  "phone": "1234567890",
  "password": "securePassword123",
  "gender": "male",
  "dob": "1990-01-01"
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

#### Verify Token
```http
GET /api/v1/customers/verify-token
Authorization: Bearer <jwt_token>
```

#### Get Current User
```http
GET /api/v1/customers/me
Authorization: Bearer <jwt_token>
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
POST /api/v1/cart/items
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": "product_id",
  "variantSku": "variant_sku",
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

#### Check Wishlist Status
```http
GET /api/v1/wishlist/check/:productId?variantSku=sku
Authorization: Bearer <jwt_token>
```

#### Add to Wishlist
```http
POST /api/v1/wishlist/items
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": "product_id",
  "variantSku": "variant_sku"
}
```

#### Remove from Wishlist
```http
DELETE /api/v1/wishlist/items/:itemId
Authorization: Bearer <jwt_token>
```

#### Clear Wishlist
```http
DELETE /api/v1/wishlist
Authorization: Bearer <jwt_token>
```

### Order Management
#### Get Orders
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
  "items": [
    {
      "product": "product_id",
      "variantSku": "variant_sku",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "fullname": "John Doe",
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "postalCode": "12345",
    "country": "Country",
    "phone": "1234567890"
  },
  "paymentMethod": "card"
}
```

### Reviews
#### Create Review
```http
POST /api/v1/reviews
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "product": "product_id",
  "rating": 5,
  "title": "Great product!",
  "review": "This product exceeded my expectations..."
}
```

---

## Admin APIs (Session Authentication Required)

### Product Management
#### Get All Products (Admin)
```http
GET /admin/v1/products
Cookie: multitrade.sid=<session_id>
```

#### Create Product
```http
POST /admin/v1/products
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

title: Product Name
description: Product description
price: 999.99
category: category_id
brand: brand_id
variants[0][sku]: VARIANT-SKU-1
variants[0][price]: 999.99
variants[0][stock]: 100
images: [file uploads]
```

#### Update Product
```http
PUT /admin/v1/products/:id
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data
```

#### Delete Product
```http
DELETE /admin/v1/products/:id
Cookie: multitrade.sid=<session_id>
```

### Bulk Upload
#### Upload Products CSV
```http
POST /admin/v1/products/bulk-upload/upload
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

file: products.csv
uploadMode: create|update
validateOnly: false
```

#### Download Template
```http
GET /admin/v1/products/bulk-upload/template
Cookie: multitrade.sid=<session_id>
```

#### Download Sample
```http
GET /admin/v1/products/bulk-upload/sample
Cookie: multitrade.sid=<session_id>
```

### Category Management
#### Get Categories (Admin)
```http
GET /admin/v1/parameters/categories
Cookie: multitrade.sid=<session_id>
```

#### Create Category
```http
POST /admin/v1/parameters/categories
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

name: Category Name
isActive: true
isFeatured: false
icon: [file upload]
```

#### Update Category
```http
PUT /admin/v1/parameters/categories/:id
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data
```

#### Delete Category
```http
DELETE /admin/v1/parameters/categories/:id
Cookie: multitrade.sid=<session_id>
```

### Brand Management
#### Get Brands (Admin)
```http
GET /admin/v1/parameters/brands
Cookie: multitrade.sid=<session_id>
```

#### Create Brand
```http
POST /admin/v1/parameters/brands
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

name: Brand Name
isActive: true
isFeatured: false
logo: [file upload]
```

### Order Management (Admin)
#### Get All Orders
```http
GET /admin/v1/order
Cookie: multitrade.sid=<session_id>
```

#### Update Order Status
```http
PUT /admin/v1/order/:orderId/status
Cookie: multitrade.sid=<session_id>
Content-Type: application/json

{
  "status": "processing",
  "message": "Order is being processed"
}
```

### Inventory Management
#### Get Inventory Dashboard
```http
GET /api/v1/inventory/dashboard
Cookie: multitrade.sid=<session_id>
```

#### Get Low Stock Items
```http
GET /api/v1/inventory/low-stock
Cookie: multitrade.sid=<session_id>
```

#### Update Stock
```http
PUT /api/v1/inventory/stock
Cookie: multitrade.sid=<session_id>
Content-Type: application/json

{
  "productId": "product_id",
  "variantSku": "variant_sku",
  "newStock": 50,
  "reason": "Stock adjustment"
}
```

### Content Management (Admin)
#### Hero Carousel
```http
POST /admin/v1/parameters/hero-carousel
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

title: Carousel Title
link: https://example.com
status: active
image: [file upload]
```

#### Ads Panel
```http
POST /admin/v1/parameters/ads-panel
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

title: Ad Title
locationId: homepage-banner
link: https://example.com
image: [file upload]
```

#### Parameter Posters
```http
POST /admin/v1/content/parameter-posters
Cookie: multitrade.sid=<session_id>
Content-Type: multipart/form-data

title: Poster Title
parameterType: category|brand
parameterId: parameter_id
status: active
image: [file upload]
```

#### Brand Carousel
```http
POST /admin/v1/content/brand-carousel
Cookie: multitrade.sid=<session_id>
Content-Type: application/json

{
  "brand": "brand_id",
  "order": 1,
  "status": "active"
}
```

### Reports & Analytics
#### Comprehensive Dashboard
```http
GET /admin/reports/comprehensive
Cookie: multitrade.sid=<session_id>
```

#### Export Dashboard Data
```http
GET /admin/reports/comprehensive/excel
Cookie: multitrade.sid=<session_id>
```

```http
GET /admin/reports/comprehensive/csv
Cookie: multitrade.sid=<session_id>
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors if any
  ]
}
```

---

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

## File Upload
- **Supported formats**: JPG, JPEG, PNG, WEBP
- **Max file size**: 5MB
- **Upload path**: `/uploads/`
- **Multiple files**: Supported for product images

---

## Pagination
Query parameters for paginated endpoints:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Sort field
- `order` - Sort order (asc/desc)

---

## Filtering
Query parameters for filtered endpoints:
- `category` - Filter by category ID
- `brand` - Filter by brand ID
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `status` - Filter by status
- `featured` - Filter featured items
- `search` - Search query