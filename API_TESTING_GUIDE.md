# API Testing Guide

## Setup Instructions

### 1. Import Postman Collection
- Import `POSTMAN_API_COLLECTION.json` into Postman
- Set environment variable: `baseUrl = http://localhost:9001`

### 2. Start Server
```bash
npm start
```

### 3. Seed Database (Optional)
```bash
npm run seed:dev
```

## API Endpoints Overview

### 🏷️ Categories
- **GET** `/api/v1/categories` - Get all categories
- **GET** `/api/v1/categories/hierarchy` - Get categories with subcategories

### 📂 SubCategories  
- **GET** `/api/v1/subcategories` - Get all subcategories
- **GET** `/api/v1/subcategories/categories/:categoryId` - Get subcategories by category
- **GET** `/api/v1/subcategories/:subCategoryId/products` - Get products by subcategory

### 🏪 Types
- **GET** `/api/v1/types` - Get all types
- **GET** `/api/v1/types/subcategories/:subCategoryId` - Get types by subcategory
- **GET** `/api/v1/types/:typeId/products` - Get products by type

### 🏢 Brands
- **GET** `/api/v1/brands` - Get all brands
- **GET** `/api/v1/brands/:brandId/products` - Get products by brand

### 📦 Products
- **GET** `/api/v1/products` - Get all products (with filters)
- **GET** `/api/v1/products/:id` - Get product by ID
- **GET** `/api/v1/products/filters` - Get filter options

### 🛒 Cart (Requires JWT)
- **GET** `/api/cart` - Get user cart
- **POST** `/api/cart` - Add item to cart
- **PUT** `/api/cart/items/:itemId` - Update item quantity
- **DELETE** `/api/cart/items/:itemId` - Remove item from cart
- **DELETE** `/api/cart` - Clear cart

### ❤️ Wishlist (Requires JWT)
- **GET** `/api/wishlist` - Get user wishlist
- **POST** `/api/wishlist/items` - Add item to wishlist
- **DELETE** `/api/wishlist/items/:itemId` - Remove item from wishlist
- **DELETE** `/api/wishlist` - Clear wishlist

### 📋 Orders (Requires JWT)
- **POST** `/api/orders/checkout` - Place order
- **GET** `/api/orders/order-history` - Get order history

### 👤 Customer Authentication
- **POST** `/api/v1/customers/register` - Register customer
- **POST** `/api/v1/customers/login` - Login customer
- **POST** `/api/v1/customers/forgot-password` - Request password reset
- **POST** `/api/v1/customers/reset-password` - Reset password with OTP

## Testing Steps

### Step 1: Test Categories
```
GET http://localhost:9001/api/v1/categories
```
**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345a",
      "name": "Electronics",
      "slug": "electronics",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012345b", 
      "name": "Fashion",
      "slug": "fashion",
      "createdAt": "2024-01-15T10:31:00.000Z"
    }
  ]
}
```

### Step 2: Test Category Hierarchy
```
GET http://localhost:9001/api/v1/categories/hierarchy
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345a",
      "name": "Electronics",
      "slug": "electronics",
      "subCategories": [
        {
          "_id": "64a1b2c3d4e5f6789012346a",
          "name": "Smartphones",
          "slug": "smartphones"
        },
        {
          "_id": "64a1b2c3d4e5f6789012346b",
          "name": "Laptops",
          "slug": "laptops"
        }
      ]
    }
  ]
}
```

### Step 3: Test SubCategories
```
GET http://localhost:9001/api/v1/subcategories
```
**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012346a",
      "name": "Smartphones",
      "slug": "smartphones",
      "category": {
        "_id": "64a1b2c3d4e5f6789012345a",
        "name": "Electronics",
        "slug": "electronics"
      },
      "createdAt": "2024-01-15T10:32:00.000Z"
    }
  ]
}
```

### Step 4: Test SubCategories by Category
```
GET http://localhost:9001/api/v1/subcategories/categories/64a1b2c3d4e5f6789012345a
```
**Expected Response:**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789012346a",
    "name": "Smartphones"
  },
  {
    "_id": "64a1b2c3d4e5f6789012346b",
    "name": "Laptops"
  }
]
```

### Step 5: Test Types
```
GET http://localhost:9001/api/v1/types
```
**Expected Response:**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789012347a",
    "name": "Premium Smartphones",
    "category": {
      "_id": "64a1b2c3d4e5f6789012345a",
      "name": "Electronics"
    },
    "subCategory": {
      "_id": "64a1b2c3d4e5f6789012346a", 
      "name": "Smartphones"
    },
    "createdAt": "2024-01-15T10:33:00.000Z"
  }
]
```

### Step 6: Test Types by SubCategory
```
GET http://localhost:9001/api/v1/types/subcategories/64a1b2c3d4e5f6789012346a
```
**Expected Response:**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789012347a",
    "name": "Premium Smartphones",
    "slug": "premium-smartphones"
  },
  {
    "_id": "64a1b2c3d4e5f6789012347b",
    "name": "Budget Smartphones",
    "slug": "budget-smartphones"
  }
]
```

### Step 7: Test Brands
```
GET http://localhost:9001/api/v1/brands
```
**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012348a",
      "name": "Apple",
      "slug": "apple",
      "createdAt": "2024-01-15T10:34:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012348b",
      "name": "Samsung",
      "slug": "samsung", 
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ]
}
```

### Step 8: Test Products by SubCategory
```
GET http://localhost:9001/api/v1/subcategories/64a1b2c3d4e5f6789012346a/products?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "price": 999.99,
      "status": "active",
      "thumbnail": "/uploads/iphone15pro.jpg",
      "brand": {
        "_id": "64a1b2c3d4e5f6789012348a",
        "name": "Apple"
      },
      "specifications": [
        {
          "_id": "64a1b2c3d4e5f6789012350a",
          "specList": {
            "_id": "64a1b2c3d4e5f6789012351a",
            "title": "Display"
          },
          "value": "6.1-inch Super Retina XDR"
        }
      ]
    }
  ],
  "pagination": {
    "current": 1,
    "total": 1,
    "hasNext": false,
    "hasPrev": false,
    "totalProducts": 1
  }
}
```

### Step 9: Test Products by Type
```
GET http://localhost:9001/api/v1/types/64a1b2c3d4e5f6789012347a/products?page=1&limit=10
```

### Step 10: Test Products by Brand
```
GET http://localhost:9001/api/v1/brands/64a1b2c3d4e5f6789012348a/products?page=1&limit=10
```

### Step 11: Test Products
```
GET http://localhost:9001/api/v1/products
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "description": "Latest iPhone with A17 Pro chip",
      "price": 999.99,
      "status": "active",
      "featured": true,
      "category": {
        "_id": "64a1b2c3d4e5f6789012345a",
        "name": "Electronics"
      },
      "brand": {
        "_id": "64a1b2c3d4e5f6789012348a", 
        "name": "Apple"
      },
      "variants": [
        {
          "sku": "APPLE-IP15P-128-NT",
          "price": 999.99,
          "qty": 50,
          "color": "Natural Titanium",
          "size": "128GB"
        }
      ],
      "specifications": [
        {
          "_id": "64a1b2c3d4e5f6789012350a",
          "specList": {
            "_id": "64a1b2c3d4e5f6789012351a",
            "title": "Display"
          },
          "value": "6.1-inch Super Retina XDR"
        },
        {
          "_id": "64a1b2c3d4e5f6789012350b",
          "specList": {
            "_id": "64a1b2c3d4e5f6789012351b",
            "title": "Processor"
          },
          "value": "A17 Pro chip"
        }
      ]
    }
  ],
  "pagination": {
    "current": 1,
    "total": 1,
    "hasNext": false,
    "hasPrev": false,
    "totalProducts": 1
  }
}
```

### Step 12: Test Product Filters
```
GET http://localhost:9001/api/v1/products/filters
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "64a1b2c3d4e5f6789012345a",
        "name": "Electronics"
      }
    ],
    "brands": [
      {
        "_id": "64a1b2c3d4e5f6789012348a",
        "name": "Apple"
      }
    ],
    "priceRange": {
      "minPrice": 99.99,
      "maxPrice": 2499.99
    }
  }
}
```

## Authentication Required APIs

### Step 13: Customer Registration
```
POST http://localhost:9001/api/v1/customers/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com", 
  "fullname": "Test User",
  "phone": "+1234567890",
  "password": "password123",
  "gender": "male",
  "dob": "1990-01-01"
}
```

### Step 14: Customer Login
```
POST http://localhost:9001/api/v1/customers/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 15: Test Cart (Requires Token)
```
GET http://localhost:9001/api/cart
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Step 16: Add to Cart
```
POST http://localhost:9001/api/cart
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a",
  "variantSku": "APPLE-IP15P-128-NT", 
  "quantity": 2
}
```

## Wishlist API Testing

### Step 17: Get Wishlist
```
GET http://localhost:9001/api/v1/wishlist
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "64a1b2c3d4e5f6789012370a",
        "product": {
          "id": "64a1b2c3d4e5f6789012349a",
          "title": "iPhone 15 Pro",
          "thumbnail": "/uploads/iphone15pro.jpg",
          "price": 999,
          "rating": 4.5,
          "slug": "iphone-15-pro"
        },
        "addedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "itemCount": 1
  }
}
```

### Step 18: Add to Wishlist
```
POST http://localhost:9001/api/v1/wishlist/items
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a"
}
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "id": "64a1b2c3d4e5f6789012370a",
    "product": {
      "id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro",
      "thumbnail": "/uploads/iphone15pro.jpg",
      "price": 999,
      "rating": 4.5,
      "slug": "iphone-15-pro"
    },
    "addedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### Step 19: Remove from Wishlist
```
DELETE http://localhost:9001/api/v1/wishlist/items/64a1b2c3d4e5f6789012370a
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Item removed from wishlist"
}
```

### Step 20: Clear Wishlist
```
DELETE http://localhost:9001/api/v1/wishlist
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Cleared 3 items from wishlist",
  "data": {
    "items": [],
    "itemCount": 0
  }
}
```

## Wishlist API Error Testing

### Invalid Product ID Test
```
POST http://localhost:9001/api/v1/wishlist/items
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "invalid-id"
}
```
**Expected Error Response:**
```json
{
  "success": false,
  "message": "Invalid product ID"
}
```

### Duplicate Product Test
```
POST http://localhost:9001/api/v1/wishlist/items
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a"
}
```
**Expected Error Response:**
```json
{
  "success": false,
  "message": "Product already in wishlist"
}
```

### Non-existent Item Test
```
DELETE http://localhost:9001/api/v1/wishlist/items/64a1b2c3d4e5f6789012999a
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Error Response:**
```json
{
  "success": false,
  "message": "Wishlist item not found"
}
```

### Step 21: Test Checkout
```
POST http://localhost:9001/api/orders/checkout
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "useNewAddress": true,
  "shippingAddress": {
    "fullName": "Test User",
    "street": "123 Main St",
    "city": "Kathmandu",
    "state": "Bagmati",
    "postalCode": "44600",
    "phone": "+9779841123456"
  }
}
```

### Step 22: Test Order History
```
GET http://localhost:9001/api/orders/order-history
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Review API Testing

### Step 23: Test Product Reviews (Public)
```
GET http://localhost:9001/api/v1/reviews/products/64a1b2c3d4e5f6789012349a?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro",
      "rating": 4.5,
      "reviewCount": 25
    },
    "reviews": [
      {
        "_id": "64a1b2c3d4e5f6789012360a",
        "rating": 5,
        "review": "Excellent product! Very satisfied with the quality and performance.",
        "user": {
          "_id": "64a1b2c3d4e5f6789012355a",
          "fullname": "John Doe"
        },
        "status": "approved",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "ratingDistribution": {
      "5": 15,
      "4": 8,
      "3": 2,
      "2": 0,
      "1": 0
    },
    "pagination": {
      "current": 1,
      "total": 3,
      "hasNext": true,
      "hasPrev": false,
      "totalReviews": 25
    }
  }
}
```

### Step 24: Check if User Can Review Product
```
GET http://localhost:9001/api/v1/reviews/can-review/64a1b2c3d4e5f6789012349a
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response (if user hasn't reviewed):**
```json
{
  "success": true,
  "data": {
    "canReview": true,
    "hasReviewed": false,
    "existingReview": null
  }
}
```

### Step 25: Add Product Review
```
POST http://localhost:9001/api/v1/reviews
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 5,
  "review": "Amazing product! Exceeded my expectations. The build quality is excellent and performance is outstanding. Highly recommend to anyone looking for a premium smartphone."
}
```
**Test Data Variations:**
```json
// Minimum valid review
{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 4,
  "review": "Good product overall."
}

// Detailed review
{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 3,
  "review": "The product is decent but has some issues. The battery life could be better and the camera quality in low light is not great. However, the display is crisp and the overall performance is satisfactory for the price point."
}

// Negative review
{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 2,
  "review": "Disappointed with this purchase. The product doesn't match the description and quality is below expectations."
}
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Review added successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012361a",
    "product": {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro"
    },
    "user": {
      "_id": "64a1b2c3d4e5f6789012355b",
      "fullname": "Test User"
    },
    "rating": 5,
    "review": "Amazing product! Exceeded my expectations. The build quality is excellent and performance is outstanding. Highly recommend to anyone looking for a premium smartphone.",
    "status": "pending",
    "createdAt": "2024-01-20T11:00:00.000Z",
    "updatedAt": "2024-01-20T11:00:00.000Z"
  }
}
```

### Step 26: Get User's Reviews
```
GET http://localhost:9001/api/v1/reviews/my-reviews?page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012361a",
      "rating": 5,
      "review": "Amazing product! Exceeded my expectations.",
      "status": "pending",
      "product": {
        "_id": "64a1b2c3d4e5f6789012349a",
        "title": "iPhone 15 Pro",
        "thumbnail": "/uploads/iphone15pro.jpg",
        "slug": "iphone-15-pro"
      },
      "createdAt": "2024-01-20T11:00:00.000Z",
      "updatedAt": "2024-01-20T11:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "total": 1,
    "hasNext": false,
    "hasPrev": false,
    "totalReviews": 1
  }
}
```

### Step 27: Get Single Review
```
GET http://localhost:9001/api/v1/reviews/64a1b2c3d4e5f6789012361a
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012361a",
    "product": {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro"
    },
    "user": {
      "_id": "64a1b2c3d4e5f6789012355b",
      "fullname": "Test User"
    },
    "rating": 5,
    "review": "Amazing product! Exceeded my expectations.",
    "status": "pending",
    "createdAt": "2024-01-20T11:00:00.000Z",
    "updatedAt": "2024-01-20T11:00:00.000Z"
  }
}
```

### Step 28: Update Review
```
PUT http://localhost:9001/api/v1/reviews/64a1b2c3d4e5f6789012361a
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "rating": 4,
  "review": "Good product overall. Updated my review after using it for a month. The initial excitement has settled and I have a more balanced perspective now."
}
```
**Test Data Variations:**
```json
// Update only rating
{
  "rating": 3
}

// Update only review text
{
  "review": "Changed my mind about this product after extended use. It's actually quite good."
}

// Update both rating and review
{
  "rating": 5,
  "review": "After 6 months of use, I can confidently say this is an excellent product. Very satisfied with the purchase."
}
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012361a",
    "product": {
      "_id": "64a1b2c3d4e5f6789012349a",
      "title": "iPhone 15 Pro"
    },
    "user": {
      "_id": "64a1b2c3d4e5f6789012355b",
      "fullname": "Test User"
    },
    "rating": 4,
    "review": "Good product overall. Updated my review after using it for a month.",
    "status": "pending",
    "createdAt": "2024-01-20T11:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  }
}
```
**Note:** When a review is updated, its status is reset to "pending" and requires admin re-approval.

### Step 29: Delete Review
```
DELETE http://localhost:9001/api/v1/reviews/64a1b2c3d4e5f6789012361a
Authorization: Bearer YOUR_ACCESS_TOKEN
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

## Review API Error Testing

### Invalid Data Tests
```
# Missing required fields
POST http://localhost:9001/api/v1/reviews
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a"
  // Missing rating and review
}

# Invalid rating
{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 6,  // Invalid: must be 1-5
  "review": "Test review"
}

# Review too short
{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 5,
  "review": "Short"  // Invalid: must be at least 10 characters
}

# Invalid product ID
{
  "productId": "invalid-id",
  "rating": 5,
  "review": "This is a valid review text"
}

# Non-existent product
{
  "productId": "64a1b2c3d4e5f6789012999a",
  "rating": 5,
  "review": "This is a valid review text"
}
```

### Duplicate Review Test
```
# Try to add second review for same product
POST http://localhost:9001/api/v1/reviews
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a",  // Same product as before
  "rating": 4,
  "review": "Trying to add another review"
}

# Expected Error Response:
{
  "success": false,
  "message": "You have already reviewed this product"
}
```

### Unauthorized Access Tests
```
# Try to access protected endpoints without token
POST http://localhost:9001/api/v1/reviews
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6789012349a",
  "rating": 5,
  "review": "This should fail"
}

# Try to update someone else's review
PUT http://localhost:9001/api/v1/reviews/SOMEONE_ELSES_REVIEW_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "rating": 1,
  "review": "Trying to update someone else's review"
}
```

## Query Parameters for Products

### Filtering Products
```
GET /api/v1/products?category=64a1b2c3d4e5f6789012345a&subCategory=64a1b2c3d4e5f6789012346a&type=64a1b2c3d4e5f6789012347a&brand=64a1b2c3d4e5f6789012348a&minPrice=100&maxPrice=1000&featured=true&sort=price_asc&page=1&limit=10
```

### Available Query Parameters
- `category` - Filter by category ID
- `subCategory` - Filter by subcategory ID
- `type` - Filter by type ID
- `brand` - Filter by brand ID
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `featured` - Show only featured products (true/false)
- `search` - Search in product title and description
- `sort` - Sort order (see options below)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12, max: 50)

### Sort Options
- `price_asc` - Price low to high
- `price_desc` - Price high to low  
- `rating` - Highest rated first
- `popular` - Most reviewed first
- `newest` - Latest products first
- `name_asc` - Name A to Z
- `name_desc` - Name Z to A

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error",
  "error": "Database connection failed"
}
```

## Testing Checklist

### Public APIs (No Authentication)
- [ ] Categories API returns data
- [ ] Category hierarchy works
- [ ] SubCategories API works
- [ ] SubCategories by category works
- [ ] Products by subcategory works
- [ ] Types API works
- [ ] Types by subcategory works
- [ ] Products by type works
- [ ] Brands API works
- [ ] Products by brand works
- [ ] Products API works with filters
- [ ] Product filters API works
- [ ] Product by ID works

### Authentication APIs
- [ ] Customer registration works
- [ ] Customer login returns JWT token
- [ ] Password reset request works
- [ ] Password reset with OTP works

### Protected APIs (Requires JWT)
- [ ] Cart APIs work with token
- [ ] Add to cart works
- [ ] Update cart item works
- [ ] Remove cart item works
- [ ] Clear cart works
- [ ] Wishlist APIs work with token
- [ ] Get wishlist returns user's items
- [ ] Add to wishlist works (productId only)
- [ ] Remove from wishlist works (by item ID)
- [ ] Clear wishlist works (removes all items)
- [ ] Duplicate product prevention works
- [ ] Invalid product ID handling works
- [ ] Checkout process works
- [ ] Order history works
- [ ] Add product review works
- [ ] Get user reviews works
- [ ] Update review works
- [ ] Delete review works
- [ ] Check can review product works

### Review APIs (Mixed Access)
- [ ] Get product reviews works (public)
- [ ] Review rating distribution works
- [ ] Review pagination works
- [ ] Product rating updates after review
- [ ] Review validation works (rating 1-5, min 10 chars)
- [ ] Duplicate review prevention works
- [ ] Only approved reviews show in public API

### Admin APIs (Session-based)
- [ ] Admin login works
- [ ] Product management works
- [ ] Category management works
- [ ] Order management works
- [ ] Reports and analytics work

## Troubleshooting

### No Data Returned
1. Check if admin has created categories/products via admin panel
2. Ensure database connection is working
3. Check server logs for errors

### Authentication Errors
1. Ensure JWT token is valid and not expired
2. Check Authorization header format: `Bearer TOKEN`
3. Verify user exists and is active

### 500 Errors
1. Check server logs
2. Verify database connection
3. Ensure all required models are properly imported