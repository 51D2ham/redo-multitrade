# Complete API Endpoints

## 🏷️ Categories
- **GET** `/api/v1/categories` - Get all categories
- **GET** `/api/v1/categories/hierarchy` - Get categories with subcategories

## 📂 SubCategories  
- **GET** `/api/v1/subcategories` - Get all subcategories
- **GET** `/api/v1/subcategories/categories/:categoryId` - Get subcategories by category
- **GET** `/api/v1/subcategories/:subCategoryId/products` - Get products by subcategory

## 🏪 Types
- **GET** `/api/v1/types` - Get all types
- **GET** `/api/v1/types/subcategories/:subCategoryId` - Get types by subcategory
- **GET** `/api/v1/types/:typeId/products` - Get products by type

## 🏢 Brands
- **GET** `/api/v1/brands` - Get all brands
- **GET** `/api/v1/brands/:brandId/products` - Get products by brand

## 📦 Products
- **GET** `/api/v1/products` - Get all products (with filters)
- **GET** `/api/v1/products/:id` - Get product by ID
- **GET** `/api/v1/products/filters` - Get filter options

## Testing Examples

### Get Products by SubCategory
```
GET http://localhost:9001/api/v1/subcategories/64a1b2c3d4e5f6789012346a/products
GET http://localhost:9001/api/v1/subcategories/64a1b2c3d4e5f6789012346a/products?page=1&limit=10
```

### Get Products by Type
```
GET http://localhost:9001/api/v1/types/64a1b2c3d4e5f6789012347a/products
GET http://localhost:9001/api/v1/types/64a1b2c3d4e5f6789012347a/products?page=1&limit=5
```

### Get Products by Brand
```
GET http://localhost:9001/api/v1/brands/64a1b2c3d4e5f6789012348a/products
GET http://localhost:9001/api/v1/brands/64a1b2c3d4e5f6789012348a/products?page=1&limit=20
```

## Expected Response Format

All product endpoints return the same format:

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
      "isDiscounted": false,
      "category": {
        "_id": "64a1b2c3d4e5f6789012345a",
        "name": "Electronics",
        "slug": "electronics"
      },
      "subCategory": {
        "_id": "64a1b2c3d4e5f6789012346a",
        "name": "Smartphones",
        "slug": "smartphones"
      },
      "type": {
        "_id": "64a1b2c3d4e5f6789012347a",
        "name": "Premium Smartphones",
        "slug": "premium-smartphones"
      },
      "brand": {
        "_id": "64a1b2c3d4e5f6789012348a",
        "name": "Apple",
        "slug": "apple"
      },
      "variants": [
        {
          "sku": "APPLE-IP15P-128-NT",
          "price": 999.99,
          "discountPrice": 949.99,
          "qty": 50,
          "color": "Natural Titanium",
          "size": "128GB",
          "isDefault": true
        }
      ],
      "images": ["/uploads/iphone-15-pro-1.jpg"],
      "rating": 4.8,
      "reviewCount": 125,
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "total": 5,
    "hasNext": true,
    "hasPrev": false,
    "totalProducts": 87
  }
}
```

## Query Parameters

All product endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

## Postman Collection Update

Add these to your Postman collection:

```json
{
  "name": "Get Products by SubCategory",
  "request": {
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/subcategories/{{subCategoryId}}/products?page=1&limit=10"
  }
},
{
  "name": "Get Products by Type", 
  "request": {
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/types/{{typeId}}/products?page=1&limit=10"
  }
},
{
  "name": "Get Products by Brand",
  "request": {
    "method": "GET", 
    "url": "{{baseUrl}}/api/v1/brands/{{brandId}}/products?page=1&limit=10"
  }
}
```

## Testing Flow

1. **Get Categories** → Copy a category ID
2. **Get SubCategories by Category** → Copy a subcategory ID  
3. **Get Products by SubCategory** → See products filtered by subcategory
4. **Get Types by SubCategory** → Copy a type ID
5. **Get Products by Type** → See products filtered by type
6. **Get Brands** → Copy a brand ID
7. **Get Products by Brand** → See products filtered by brand

All APIs are ready to test! 🚀