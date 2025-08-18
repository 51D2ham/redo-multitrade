# Cart API Testing Guide

## Updated Cart Schema
```javascript
{
  qty: Number (required, min: 1),
  productType: String (optional),
  productPrice: Number (required, min: 0),
  totalPrice: Number (required, min: 0, auto-calculated),
  user: ObjectId (required, ref: 'User'),
  product: ObjectId (required, ref: 'Product')
}
```

## API Endpoints

### 1. Get Cart
```
GET /api/v1/cart/
Headers: Authorization: Bearer <jwt_token>
```

### 2. Add Item to Cart
```
POST /api/v1/cart/items
Headers: Authorization: Bearer <jwt_token>
Body: {
  "productId": "product_object_id",
  "qty": 2,
  "productType": "electronics" // optional
}
```

### 3. Update Cart Item
```
PUT /api/v1/cart/items/:itemId
Headers: Authorization: Bearer <jwt_token>
Body: {
  "qty": 3
}
```

### 4. Remove Cart Item
```
DELETE /api/v1/cart/items/:itemId
Headers: Authorization: Bearer <jwt_token>
```

### 5. Clear Cart
```
DELETE /api/v1/cart/
Headers: Authorization: Bearer <jwt_token>
```

### 6. Get Cart Summary
```
GET /api/v1/cart/summary
Headers: Authorization: Bearer <jwt_token>
```

## Key Features
- Auto-calculation of totalPrice (qty * productPrice)
- Duplicate item handling (increases quantity)
- Proper error handling and validation
- Structured routes similar to categories
- Optimized database queries with aggregation