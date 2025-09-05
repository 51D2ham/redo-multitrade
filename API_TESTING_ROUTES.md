# 🚀 Complete API Testing Routes - Enhanced & Fixed

## 📋 Base URL
```
http://localhost:9001
```

## 🛍️ Product APIs (Enhanced with All Filters)

### 1. Get All Products (Enhanced)
```
GET /api/v1/products
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 50)
- `category` - Category ObjectId
- `subcategory` - Subcategory ObjectId  
- `type` - Type ObjectId
- `brand` - Brand ObjectId
- `featured` - true/false
- `stock` - instock/outofstock
- `discount` - true (filter only discounted products) ✨ **FIXED**
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Search term
- `sort` - price_asc/price_desc/rating/newest/oldest/name_asc/name_desc

**Test Examples:**
```bash
# All products
GET /api/v1/products

# Discounted products only (FIXED)
GET /api/v1/products?discount=true

# Price range filter
GET /api/v1/products?minPrice=1000&maxPrice=50000

# Multiple filters
GET /api/v1/products?category=CATEGORY_ID&discount=true&sort=price_asc

# Search with filters
GET /api/v1/products?search=headphones&brand=BRAND_ID&stock=instock
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

### 6. Get Single Product
```
GET /api/v1/products/:productId
```

### 7. Get Product Filters (Enhanced)
```
GET /api/v1/products/filters
```
**Returns:** Categories, Brands, Subcategories, Types ✨ **ENHANCED**

## 🏷️ Filter/Parameter APIs

### 1. Categories
```
GET /api/v1/categories
GET /api/v1/categories/hierarchy
```

### 2. Brands
```
GET /api/v1/brands
```

### 3. Subcategories
```
GET /api/v1/subcategories
GET /api/v1/subcategories/categories/:categoryId
```

### 4. Types
```
GET /api/v1/types
GET /api/v1/types/subcategories/:subCategoryId
```

## 🧪 Test Scenarios

### Scenario 1: Basic Product Listing
```bash
curl "http://localhost:9001/api/v1/products?page=1&limit=10"
```

### Scenario 2: Discount Filter (FIXED)
```bash
curl "http://localhost:9001/api/v1/products?discount=true&sort=price_asc"
```

### Scenario 3: Price Range Filter
```bash
curl "http://localhost:9001/api/v1/products?minPrice=5000&maxPrice=25000"
```

### Scenario 4: Category + Discount
```bash
curl "http://localhost:9001/api/v1/products?category=CATEGORY_ID&discount=true"
```

### Scenario 5: Search + Filters
```bash
curl "http://localhost:9001/api/v1/products?search=sony&brand=BRAND_ID&stock=instock"
```

### Scenario 6: Get All Filters
```bash
curl "http://localhost:9001/api/v1/products/filters"
```

## 📊 Expected Response Format

### Product List Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "68b6d3d0fc2ecc6ac6f28f8b",
      "title": "Sony WH-1000XM5",
      "thumbnail": "/uploads/products/1756813470861-192737586.jpg",
      "price": 45000,
      "originalPrice": 49999,
      "isOnSale": true,
      "discountPercent": 10,
      "rating": 4.5,
      "reviewCount": 25,
      "totalStock": 20,
      "featured": false,
      "category": {
        "_id": "68b6d3cafc2ecc6ac6f28f15",
        "name": "Electronics"
      },
      "brand": {
        "_id": "68b6d3cffc2ecc6ac6f28f88",
        "name": "Sony"
      }
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

### Filters Response (Enhanced)
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "68b6d3cafc2ecc6ac6f28f15",
        "name": "Electronics",
        "slug": "electronics"
      }
    ],
    "brands": [
      {
        "_id": "68b6d3cffc2ecc6ac6f28f88",
        "name": "Sony",
        "slug": "sony"
      }
    ],
    "subcategories": [
      {
        "_id": "68b6d3cafc2ecc6ac6f28f16",
        "name": "Headphones",
        "slug": "headphones",
        "category": {
          "_id": "68b6d3cafc2ecc6ac6f28f15",
          "name": "Electronics"
        }
      }
    ],
    "types": [
      {
        "_id": "68b6d3cffc2ecc6ac6f28f89",
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "category": {
          "_id": "68b6d3cafc2ecc6ac6f28f15",
          "name": "Electronics"
        },
        "subCategory": {
          "_id": "68b6d3cafc2ecc6ac6f28f16",
          "name": "Headphones"
        }
      }
    ]
  }
}
```

## 🔧 Testing Tools

### Using cURL
```bash
# Test discount filter
curl -X GET "http://localhost:9001/api/v1/products?discount=true" \
  -H "Content-Type: application/json"

# Test with multiple filters
curl -X GET "http://localhost:9001/api/v1/products?discount=true&minPrice=1000&maxPrice=50000&sort=price_asc" \
  -H "Content-Type: application/json"
```

### Using Postman
1. Create new GET request
2. URL: `http://localhost:9001/api/v1/products`
3. Add query parameters as needed
4. Send request

### Using JavaScript/Fetch
```javascript
// Test discount filter
const response = await fetch('/api/v1/products?discount=true&sort=price_desc');
const data = await response.json();
console.log('Discounted products:', data.data);

// Test price range
const priceFiltered = await fetch('/api/v1/products?minPrice=5000&maxPrice=25000');
const priceData = await priceFiltered.json();
console.log('Price filtered products:', priceData.data);
```

## ✅ What's Fixed & Enhanced

### 🔧 Fixed Issues:
1. **Discount Filter** - Now works with `?discount=true`
2. **Input Sanitization** - Search terms are sanitized
3. **Price Range Filter** - Added minPrice/maxPrice support
4. **Stock Filter** - Enhanced stock filtering
5. **Multiple Filters** - All filters work together

### 🚀 Enhanced Features:
1. **More Sort Options** - Added name_asc, name_desc, oldest
2. **Subcategory Filter** - Added subcategory filtering
3. **Type Filter** - Added type filtering  
4. **Enhanced Filters API** - Returns all filter options
5. **Post-filtering** - Discount filter works on calculated values

## 🎯 Quick Test Checklist

- [ ] Basic product listing works
- [ ] Discount filter returns only discounted products
- [ ] Price range filter works correctly
- [ ] Search with filters works
- [ ] Category filtering works
- [ ] Brand filtering works
- [ ] Sorting options work
- [ ] Pagination works
- [ ] All filter APIs return data

## 🚨 Common Issues & Solutions

**Issue:** Discount filter not working
**Solution:** ✅ Fixed - Use `?discount=true`

**Issue:** No products returned
**Solution:** Check if products have `status: 'active'`

**Issue:** Invalid ObjectId error
**Solution:** Ensure category/brand IDs are valid 24-character hex strings

**Issue:** Search not working
**Solution:** ✅ Fixed - Search terms are now sanitized and work properly