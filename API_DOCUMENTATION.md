# 📚 Multitrade Backend - Complete API Documentation

## 🌐 Base URL
```
http://localhost:9001
```

## 🔐 Authentication
Most customer endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 👤 Customer Authentication APIs

### 1. Register Customer
**POST** `/api/v1/customers/register`

**Request Body (multipart/form-data):**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "fullname": "John Doe",
  "phone": "+9779841234567",
  "password": "SecurePass123",
  "gender": "male",
  "dob": "1990-01-15",
  "permanentAddress": "Kathmandu, Nepal",
  "tempAddress": "Lalitpur, Nepal",
  "profileImage": "file" // Optional file upload
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully!"
}
```

### 2. Login Customer
**POST** `/api/v1/customers/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
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

### 3. Forgot Password
**POST** `/api/v1/customers/forgot-password`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset OTP sent to email."
}
```

### 4. Reset Password
**POST** `/api/v1/customers/reset-password`

**Request Body:**
```json
{
  "email": "john@example.com",
  "otpCode": "ABC123",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully!"
}
```

### 5. Change Password
**PUT** `/api/v1/customers/change-password`
**Requires:** JWT Authentication

**Request Body:**
```json
{
  "oldPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully!"
}
```

### 6. Logout Customer
**POST** `/api/v1/customers/logout`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully. Token invalidated."
}
```

---

## 🛒 Cart Management APIs

### 1. Get Cart
**GET** `/api/v1/cart/`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "cart": {
    "items": [
      {
        "_id": "cart_item_id",
        "qty": 2,
        "productType": "electronics",
        "productPrice": 999,
        "totalPrice": 1998,
        "product": {
          "_id": "product_id",
          "title": "Wireless Headphones",
          "images": ["/uploads/product1.jpg"]
        }
      }
    ],
    "totalItems": 1,
    "grandTotal": 1998
  }
}
```

### 2. Add Item to Cart
**POST** `/api/v1/cart/`
**Requires:** JWT Authentication

**Request Body:**
```json
{
  "productId": "product_object_id",
  "qty": 2,
  "productType": "electronics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "cartItem": {
    "_id": "cart_item_id",
    "qty": 2,
    "productPrice": 999,
    "totalPrice": 1998
  }
}
```

### 3. Update Cart Item
**PUT** `/api/v1/cart/items/:itemId`
**Requires:** JWT Authentication

**Request Body:**
```json
{
  "qty": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "cartItem": {
    "_id": "cart_item_id",
    "qty": 3,
    "totalPrice": 2997
  }
}
```

### 4. Remove Cart Item
**DELETE** `/api/v1/cart/items/:itemId`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart successfully"
}
```

### 5. Clear Cart
**DELETE** `/api/v1/cart/`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

## 💝 Wishlist Management APIs

### 1. Get Wishlist
**GET** `/api/v1/wishlist/`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "wishlist": [
    {
      "_id": "wishlist_item_id",
      "product": {
        "_id": "product_id",
        "title": "Smartphone",
        "price": 25000,
        "images": ["/uploads/phone1.jpg"]
      },
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### 2. Add Item to Wishlist
**POST** `/api/v1/wishlist/items`
**Requires:** JWT Authentication

**Request Body:**
```json
{
  "productId": "product_object_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to wishlist successfully"
}
```

### 3. Remove Wishlist Item
**DELETE** `/api/v1/wishlist/items/:itemId`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Item removed from wishlist successfully"
}
```

### 4. Clear Wishlist
**DELETE** `/api/v1/wishlist/`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Wishlist cleared successfully"
}
```

---

## 📦 Order Management APIs

### 1. Checkout
**POST** `/api/v1/orders/checkout`
**Requires:** JWT Authentication

**Request Body (New Address):**
```json
{
  "useNewAddress": true,
  "shippingAddress": {
    "fullname": "John Doe",
    "street": "Thamel-15",
    "city": "Kathmandu",
    "state": "Bagmati",
    "postalCode": "44600",
    "country": "Nepal",
    "phone": "+9779841234567",
    "landmark": "Near Durbar Square"
  },
  "paymentMethod": "cod"
}
```

**Request Body (Saved Address):**
```json
{
  "useNewAddress": false,
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "_id": "order_id",
    "totalPrice": 1998,
    "totalItem": 1,
    "totalQty": 2,
    "status": "pending",
    "paymentMethod": "cod",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Order History
**GET** `/api/v1/orders/order-history`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "_id": "order_id",
      "totalPrice": 1998,
      "totalItem": 1,
      "status": "delivered",
      "paymentMethod": "cod",
      "createdAt": "2025-01-10T10:30:00.000Z",
      "shippingAddress": {
        "fullname": "John Doe",
        "street": "Thamel-15",
        "city": "Kathmandu"
      }
    }
  ]
}
```

### 3. Get Order Details
**GET** `/api/v1/orders/:orderId`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "order_id",
    "totalPrice": 1998,
    "status": "processing",
    "items": [
      {
        "product": {
          "title": "Wireless Headphones",
          "images": ["/uploads/product1.jpg"]
        },
        "qty": 2,
        "price": 999
      }
    ],
    "statusHistory": [
      {
        "status": "pending",
        "dateTime": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### 4. Cancel Order
**POST** `/api/v1/orders/:orderId/cancel`
**Requires:** JWT Authentication

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### 5. Track Order (Public)
**GET** `/api/v1/orders/track/:trackingNumber`

**Response:**
```json
{
  "success": true,
  "order": {
    "status": "shipped",
    "trackingNumber": "TRK123456789",
    "estimatedDelivery": "2025-01-20",
    "statusHistory": [
      {
        "status": "pending",
        "dateTime": "2025-01-15T10:30:00.000Z"
      },
      {
        "status": "processing",
        "dateTime": "2025-01-16T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 🛍️ Product APIs (Public)

### 1. Get All Products
**GET** `/api/v1/products/`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category ID
- `brand` (string): Filter by brand ID
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `search` (string): Search in title and description
- `sortBy` (string): Sort field (price, createdAt, rating)
- `sortOrder` (string): asc or desc

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "_id": "product_id",
      "title": "Wireless Headphones",
      "description": "High quality wireless headphones",
      "price": 999,
      "rating": 4.5,
      "reviewCount": 25,
      "images": ["/uploads/product1.jpg"],
      "category": {
        "_id": "category_id",
        "name": "Electronics"
      },
      "brand": {
        "_id": "brand_id",
        "name": "Sony"
      },
      "inventory": {
        "qty": 50,
        "status": "in_stock"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Product by ID
**GET** `/api/v1/products/:id`

**Response:**
```json
{
  "success": true,
  "product": {
    "_id": "product_id",
    "title": "Wireless Headphones",
    "description": "Detailed product description...",
    "price": 999,
    "rating": 4.5,
    "reviewCount": 25,
    "images": ["/uploads/product1.jpg", "/uploads/product2.jpg"],
    "specifications": [
      {
        "title": "Battery Life",
        "value": "30 hours"
      }
    ],
    "reviews": [
      {
        "rating": 5,
        "review": "Excellent product!",
        "user": {
          "fullname": "Jane Smith"
        },
        "createdAt": "2025-01-10T10:30:00.000Z"
      }
    ]
  }
}
```

### 3. Get Product Filters
**GET** `/api/v1/products/filters`

**Response:**
```json
{
  "success": true,
  "filters": {
    "categories": [
      {
        "_id": "category_id",
        "name": "Electronics",
        "productCount": 45
      }
    ],
    "brands": [
      {
        "_id": "brand_id",
        "name": "Sony",
        "productCount": 12
      }
    ],
    "priceRange": {
      "min": 100,
      "max": 50000
    }
  }
}
```

---

## 📂 Category APIs (Public)

### 1. Get All Categories
**GET** `/api/v1/categories/`

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "_id": "category_id",
      "name": "Electronics",
      "productCount": 45,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Categories with Hierarchy
**GET** `/api/v1/categories/hierarchy`

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "_id": "category_id",
      "name": "Electronics",
      "subcategories": [
        {
          "_id": "subcategory_id",
          "name": "Audio",
          "types": [
            {
              "_id": "type_id",
              "name": "Headphones"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📝 Review APIs

### 1. Submit Review
**POST** `/api/v1/reviews/`
**Requires:** JWT Authentication

**Request Body:**
```json
{
  "productId": "product_object_id",
  "rating": 5,
  "review": "Excellent product! Highly recommended."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "_id": "review_id",
    "rating": 5,
    "review": "Excellent product! Highly recommended.",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🏢 Company Information APIs (Public)

### 1. Get Company Info
**GET** `/api/v1/company-info/`

**Response:**
```json
{
  "success": true,
  "companyInfo": {
    "companyName": "Multitrade",
    "email": "info@multitrade.com",
    "phone": "+977-1-4567890",
    "address": "Kathmandu, Nepal",
    "description": "Leading e-commerce platform in Nepal",
    "socialMedia": {
      "facebook": "https://facebook.com/multitrade",
      "instagram": "https://instagram.com/multitrade",
      "twitter": "https://twitter.com/multitrade"
    },
    "businessHours": {
      "monday": "9:00 AM - 6:00 PM",
      "tuesday": "9:00 AM - 6:00 PM"
    }
  }
}
```

---

## 🎠 Hero Carousel APIs (Public)

### 1. Get Active Carousel Items
**GET** `/api/v1/hero-carousel/`

**Response:**
```json
{
  "success": true,
  "carouselItems": [
    {
      "_id": "carousel_id",
      "title": "Summer Sale",
      "image": "/uploads/carousel1.jpg",
      "link": "/products?category=electronics",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 📢 Ads Panel APIs (Public)

### 1. Get Ads by Location
**GET** `/api/v1/ads-panel/?locationId=homepage`

**Response:**
```json
{
  "success": true,
  "ads": [
    {
      "_id": "ad_id",
      "title": "Special Offer",
      "image": "/uploads/ad1.jpg",
      "link": "/products/special-offers",
      "locationId": "homepage",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 🔍 Specification Search APIs (Public)

### 1. Get Products by Specification Value
**GET** `/api/v1/spec-lists/products`

**Query Parameters:**
- `spec` (string): Specification name (e.g., "RAM", "Storage")
- `specId` (string): Specification ID (alternative to spec name)
- `value` (string): Specification value to search for (e.g., "8GB", "256GB")
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Example Request:**
```
GET /api/v1/spec-lists/products?spec=RAM&value=8GB&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "spec": {
    "_id": "spec_id",
    "title": "RAM",
    "searchValue": "8GB"
  },
  "products": [
    {
      "_id": "product_id",
      "title": "Gaming Laptop",
      "description": "High-performance gaming laptop",
      "price": 1200,
      "images": ["/uploads/laptop1.jpg"],
      "category": {
        "_id": "category_id",
        "name": "Electronics"
      },
      "brand": {
        "_id": "brand_id",
        "name": "Dell"
      },
      "inventory": {
        "price": 1200,
        "oldPrice": 1400,
        "discountPrice": 1100,
        "qty": 15,
        "status": "in_stock"
      },
      "matchingSpecs": [
        {
          "title": "RAM",
          "value": "8GB DDR4"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalProducts": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Search Products by Specification Query
**GET** `/api/v1/spec-lists/search`

**Query Parameters:**
- `q` (string): Search query (e.g., "8GB", "256", "Black")
- `spec` (string): Filter by specific specification type (optional)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Example Request:**
```
GET /api/v1/spec-lists/search?q=8GB&spec=RAM&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "searchQuery": "8GB",
  "specFilter": "RAM",
  "products": [
    {
      "_id": "product_id",
      "title": "Gaming Laptop",
      "price": 1200,
      "inventory": {
        "price": 1200,
        "qty": 15,
        "status": "in_stock"
      },
      "matchingSpecs": [
        {
          "title": "RAM",
          "value": "8GB DDR4"
        },
        {
          "title": "Storage",
          "value": "512GB SSD"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalProducts": 18,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Available Specification Values
**GET** `/api/v1/spec-lists/values`

**Query Parameters:**
- `spec` (string): Specification name (e.g., "RAM", "Storage")
- `specId` (string): Specification ID (alternative to spec name)

**Example Request:**
```
GET /api/v1/spec-lists/values?spec=RAM
```

**Response:**
```json
{
  "success": true,
  "spec": {
    "_id": "spec_id",
    "title": "RAM"
  },
  "values": [
    {
      "value": "16GB DDR4",
      "productCount": 12
    },
    {
      "value": "8GB DDR4",
      "productCount": 8
    },
    {
      "value": "32GB DDR4",
      "productCount": 3
    },
    {
      "value": "4GB DDR4",
      "productCount": 2
    }
  ]
}
```

### 4. Get All Specifications
**GET** `/api/v1/spec-lists/`

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "spec_id",
      "title": "RAM",
      "value": "",
      "status": "active",
      "category": {
        "_id": "category_id",
        "name": "Electronics"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 📊 Error Responses

All APIs return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"] // Optional
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 🎯 Use Cases for Specification Search

### **Electronics & Tech Products:**
- **RAM**: Find laptops with "8GB RAM", "16GB RAM"
- **Storage**: Search for "256GB SSD", "1TB HDD"
- **Screen Size**: Filter by "15.6 inch", "13.3 inch"
- **Processor**: Find "Intel i7", "AMD Ryzen 5"

### **Fashion & Apparel:**
- **Size**: Search for "Medium", "Large", "XL"
- **Color**: Filter by "Black", "Blue", "Red"
- **Material**: Find "Cotton", "Polyester", "Silk"

### **Home & Appliances:**
- **Capacity**: Search for "1.5 Ton AC", "7kg Washing Machine"
- **Energy Rating**: Filter by "5 Star", "3 Star"
- **Brand**: Find products by specific brands

---

## 🔧 Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **General APIs**: 100 requests per minute
- **Specification search**: 50 requests per minute
- **File uploads**: 10 requests per minute

---

## 📱 Response Headers

All API responses include:
```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

---

## 🚀 Getting Started

1. **Base URL**: `http://localhost:9001`
2. **Register a customer** using `/api/v1/customers/register`
3. **Login** to get JWT token using `/api/v1/customers/login`
4. **Use the token** in Authorization header for protected endpoints
5. **Start shopping** with products, cart, and orders APIs!

---

## 📞 Support

For API support and questions:
- **Email**: dev@multitrade.com
- **Documentation**: This file
- **Postman Collection**: `POSTMAN_API_COLLECTION.json` - Import into Postman for instant testing

---

*Last Updated: January 2025*

---

## 🔍 Advanced Specification Filtering APIs

### 5. Get Filterable Specifications
**GET** `/api/v1/spec-lists/filters`

**Query Parameters:**
- `category` (string): Filter specs by category ID
- `subCategory` (string): Filter specs by subcategory ID
- `type` (string): Filter specs by product type ID
- `brand` (string): Filter specs by brand ID

**Example Request:**
```
GET /api/v1/spec-lists/filters?category=electronics_id
```

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "_id": "spec_id",
      "title": "RAM",
      "status": "active",
      "displayInFilter": true,
      "category": {
        "_id": "category_id",
        "name": "Electronics"
      },
      "values": [
        {
          "value": "16GB DDR4",
          "productCount": 12
        },
        {
          "value": "8GB DDR4",
          "productCount": 8
        }
      ]
    },
    {
      "_id": "spec_id_2",
      "title": "Storage",
      "status": "active",
      "displayInFilter": true,
      "values": [
        {
          "value": "512GB SSD",
          "productCount": 15
        },
        {
          "value": "1TB HDD",
          "productCount": 10
        }
      ]
    }
  ]
}
```

### 6. Advanced Multi-Specification Filtering
**GET** `/api/v1/spec-lists/filter`

**Query Parameters:**
- `specs[specId1]` (string): Comma-separated values for specification 1
- `specs[specId2]` (string): Comma-separated values for specification 2
- `category` (string): Filter by category ID (optional)
- `subCategory` (string): Filter by subcategory ID (optional)
- `type` (string): Filter by product type ID (optional)
- `brand` (string): Filter by brand ID (optional)
- `minPrice` (number): Minimum price filter (optional)
- `maxPrice` (number): Maximum price filter (optional)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Example Request:**
```
GET /api/v1/spec-lists/filter?specs[ram_spec_id]=8GB,16GB&specs[storage_spec_id]=512GB SSD,1TB SSD&minPrice=1000&maxPrice=2000&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "appliedFilters": {
    "ram_spec_id": ["8GB", "16GB"],
    "storage_spec_id": ["512GB SSD", "1TB SSD"]
  },
  "products": [
    {
      "_id": "product_id",
      "title": "Gaming Laptop Pro",
      "description": "High-performance gaming laptop",
      "price": 1500,
      "rating": 4.7,
      "images": ["/uploads/laptop-pro.jpg"],
      "category": {
        "_id": "category_id",
        "name": "Electronics"
      },
      "brand": {
        "_id": "brand_id",
        "name": "ASUS"
      },
      "inventory": {
        "price": 1500,
        "oldPrice": 1800,
        "discountPrice": 1400,
        "qty": 8,
        "status": "in_stock"
      },
      "matchingSpecs": [
        {
          "title": "RAM",
          "value": "16GB DDR4"
        },
        {
          "title": "Storage",
          "value": "512GB SSD"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalProducts": 12,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🎯 Specification Search Use Cases

### **Real-World Examples:**

#### **1. Electronics Store - Laptop Search**
```bash
# Find laptops with 16GB RAM and 512GB SSD
GET /api/v1/spec-lists/filter?specs[ram_spec_id]=16GB&specs[storage_spec_id]=512GB SSD&category=electronics_id

# Search for gaming laptops under $2000
GET /api/v1/spec-lists/filter?specs[category_spec_id]=Gaming&maxPrice=2000&category=electronics_id
```

#### **2. Fashion Store - Clothing Search**
```bash
# Find medium-sized black t-shirts
GET /api/v1/spec-lists/filter?specs[size_spec_id]=Medium&specs[color_spec_id]=Black&category=clothing_id

# Search for cotton shirts in multiple sizes
GET /api/v1/spec-lists/filter?specs[material_spec_id]=Cotton&specs[size_spec_id]=Medium,Large,XL
```

#### **3. Mobile Store - Phone Search**
```bash
# Find phones with 128GB storage and 6GB RAM
GET /api/v1/spec-lists/filter?specs[storage_spec_id]=128GB&specs[ram_spec_id]=6GB&category=mobile_id

# Search for phones under $500 with specific features
GET /api/v1/spec-lists/filter?specs[camera_spec_id]=48MP&maxPrice=500&category=mobile_id
```

---

## 🔧 Implementation Tips

### **Frontend Integration:**
```javascript
// Get filterable specifications for a category
const getFilters = async (categoryId) => {
  const response = await fetch(`/api/v1/spec-lists/filters?category=${categoryId}`);
  const data = await response.json();
  return data.data; // Array of specifications with values
};

// Apply multiple filters
const filterProducts = async (filters, page = 1) => {
  const params = new URLSearchParams();
  
  // Add specification filters
  Object.entries(filters.specs).forEach(([specId, values]) => {
    params.append(`specs[${specId}]`, values.join(','));
  });
  
  // Add other filters
  if (filters.minPrice) params.append('minPrice', filters.minPrice);
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
  params.append('page', page);
  
  const response = await fetch(`/api/v1/spec-lists/filter?${params}`);
  return await response.json();
};
```

### **Search Optimization:**
- Use specification IDs instead of names for better performance
- Implement client-side caching for specification values
- Debounce search queries to reduce API calls
- Use pagination for large result sets

---

## 📈 Performance Notes

### **Database Optimization:**
- Specifications are indexed for fast lookups
- Product queries are optimized with compound indexes
- Only active products are returned in results
- Aggregation pipelines are used for efficient counting

### **Caching Strategy:**
- Specification lists can be cached for 1 hour
- Product counts can be cached for 30 minutes
- Filter combinations can be cached for 15 minutes

---

## 🛠️ Error Handling

### **Common Specification Search Errors:**

```json
// Invalid specification ID
{
  "success": false,
  "message": "Specification not found"
}

// Missing required parameters
{
  "success": false,
  "message": "Either spec name or specId is required"
}

// No products found
{
  "success": true,
  "products": [],
  "pagination": {
    "currentPage": 1,
    "totalPages": 0,
    "totalProducts": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

*Specification Search APIs added: January 2025*