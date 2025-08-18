# Cart API Testing Guide

## Base URL
```
http://localhost:9001
```

## Authentication
All cart endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Cart API Endpoints

### 1. Get Cart
```http
GET /api/v1/cart/
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart_item_id",
        "product": {
          "id": "product_id",
          "title": "Product Name",
          "thumbnails": ["image1.jpg"],
          "slug": "product-slug"
        },
        "qty": 2,
        "productType": "electronics",
        "productPrice": 999,
        "totalPrice": 1998,
        "createdAt": "2025-01-12T10:30:00.000Z",
        "updatedAt": "2025-01-12T10:30:00.000Z"
      }
    ],
    "totalPrice": 1998,
    "totalItems": 2
  }
}
```

### 2. Add Item to Cart
```http
POST /api/v1/cart/items
Content-Type: application/json

{
  "productId": "6827160a4f338cd37695cf92",
  "qty": 2,
  "productType": "electronics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "items": [...],
    "totalPrice": 1998,
    "totalItems": 2
  }
}
```

### 3. Update Cart Item Quantity
```http
PUT /api/v1/cart/items/cart_item_id
Content-Type: application/json

{
  "qty": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "items": [...],
    "totalPrice": 2997,
    "totalItems": 3
  }
}
```

### 4. Remove Single Item
```http
DELETE /api/v1/cart/items/cart_item_id
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart successfully",
  "data": {
    "items": [...],
    "totalPrice": 0,
    "totalItems": 0
  }
}
```

### 5. Clear Entire Cart
```http
DELETE /api/v1/cart/
```

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": {
    "items": [],
    "totalPrice": 0,
    "totalItems": 0
  }
}
```

### 6. Get Cart Summary
```http
GET /api/v1/cart/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPrice": 1998,
    "totalItems": 2
  }
}
```

## Test Data Examples

### Sample Product IDs (replace with actual IDs from your database)
```
6827160a4f338cd37695cf92
682717364f338cd37695cfc1
```

### Sample JWT Token (get from login)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid product or quantity"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to add item to cart"
}
```

## Testing Steps

1. **Login first** to get JWT token:
   ```http
   POST /api/v1/customers/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Use the token** in all cart requests

3. **Test sequence:**
   - Get empty cart
   - Add items
   - Update quantities
   - Remove items
   - Clear cart