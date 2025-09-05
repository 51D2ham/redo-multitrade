# API Endpoints Summary - Fixed & Optimized

## ✅ Working Product APIs (Lightweight Data)

### 1. Get All Products
```
GET /api/v1/products
```

### 2. Get Products by Category
```
GET /api/v1/categories/:categoryId/products
```

### 3. Get Products by Subcategory  
```
GET /api/v1/subcategories/:subCategoryId/products
```

### 4. Get Products by Brand
```
GET /api/v1/brands/:brandId/products
```

### 5. Get Products by Type
```
GET /api/v1/types/:typeId/products
```

## ✅ Filter/Parameter APIs (Lightweight Data)

### 1. Get All Categories
```
GET /api/v1/categories
```

### 2. Get All Subcategories
```
GET /api/v1/subcategories
```

### 3. Get All Brands
```
GET /api/v1/brands
```

### 4. Get All Types
```
GET /api/v1/types
```

### 5. Get Category Hierarchy
```
GET /api/v1/categories/hierarchy
```

## Query Parameters (All Product APIs)
- `page` (default: 1)
- `limit` (default: 20, max: 50)
- `sort` (price_asc, price_desc, rating, newest)
- `search` (for main products API)

## Response Format (All Product APIs)
```json
{
  "_id": "product_id",
  "title": "Product Name",
  "thumbnail": "/uploads/products/image.jpg",
  "price": 45000,
  "originalPrice": 49999,
  "isOnSale": true,
  "discountPercent": 10,
  "rating": 4.5,
  "reviewCount": 25,
  "totalStock": 20,
  "featured": false,
  "category": { "_id": "cat_id", "name": "Category" },
  "brand": { "_id": "brand_id", "name": "Brand" }
}
```

## ✅ All Fixed Issues:
1. Routes properly mounted in app.js
2. Controllers return lightweight data
3. Consistent response format
4. Proper validation and error handling
5. Optimized database queries
6. Removed unnecessary fields (createdAt, admin, etc.)

## Ready to Use! 🚀