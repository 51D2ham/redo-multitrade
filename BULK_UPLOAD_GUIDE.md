# 📊 Bulk Product Upload Guide

## 🎯 Overview

The bulk upload system allows administrators to upload multiple products with variants using CSV files. This system supports complex product structures with multiple variants per product, comprehensive validation, and robust error handling.

## 🚀 Features

### ✅ **Product Management**
- **Multiple Variants**: Upload products with multiple color, size, and specification variants
- **Automatic Grouping**: Products with same title+brand are grouped with their variants
- **Category Creation**: Automatically creates missing categories, subcategories, types, and brands
- **Inventory Management**: Full variant-level inventory tracking
- **Price Management**: Support for regular, discount, and old prices per variant

### ✅ **Validation & Error Handling**
- **Pre-upload Validation**: Validate CSV structure before processing
- **Row-level Validation**: Detailed validation for each product variant
- **Comprehensive Error Reporting**: Clear error messages with row numbers
- **Rollback Safety**: Failed products don't affect successful ones

### ✅ **Upload Modes**
- **Create Mode**: Add new products (default)
- **Update Mode**: Update existing products by SKU
- **Validate Only**: Check CSV without importing

## 📋 CSV Structure

### **Required Headers**
```csv
title,description,category,subCategory,type,brand,variant_sku,variant_price,variant_qty
```

### **Complete Header List**
```csv
title,description,shortDescription,category,subCategory,type,brand,status,featured,warranty,returnPolicy,shippingInfo,tags,variant_sku,variant_color,variant_size,variant_material,variant_weight,variant_length,variant_width,variant_height,variant_price,variant_oldPrice,variant_discountPrice,variant_qty,variant_thresholdQty,variant_shipping,variant_isDefault
```

## 📝 Field Descriptions

### **Product Fields**
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `title` | String | ✅ | Product name | "iPhone 15 Pro" |
| `description` | String | ✅ | Detailed description | "Latest iPhone with A17 Pro chip" |
| `shortDescription` | String | ❌ | Brief description | "Pro camera, titanium design" |
| `category` | String | ✅ | Main category | "Electronics" |
| `subCategory` | String | ✅ | Product subcategory | "Smartphones" |
| `type` | String | ✅ | Product type | "Premium Smartphones" |
| `brand` | String | ✅ | Brand name | "Apple" |
| `status` | String | ❌ | Product status | "active", "draft", "inactive" |
| `featured` | Boolean | ❌ | Featured product | "true", "false" |
| `warranty` | String | ❌ | Warranty information | "1 year limited warranty" |
| `returnPolicy` | String | ❌ | Return policy | "14 days return policy" |
| `shippingInfo` | String | ❌ | Shipping details | "Free shipping" |
| `tags` | String | ❌ | Semicolon-separated tags | "smartphone;premium;5g" |

### **Variant Fields**
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `variant_sku` | String | ✅ | Unique variant identifier | "APPLE-IP15P-128-NT" |
| `variant_price` | Number | ✅ | Variant price | "999.99" |
| `variant_qty` | Number | ✅ | Stock quantity | "50" |
| `variant_oldPrice` | Number | ❌ | Previous price | "1099.99" |
| `variant_discountPrice` | Number | ❌ | Discounted price | "949.99" |
| `variant_color` | String | ❌ | Variant color | "Natural Titanium" |
| `variant_size` | String | ❌ | Variant size | "128GB" |
| `variant_material` | String | ❌ | Material type | "Titanium" |
| `variant_weight` | Number | ❌ | Weight in grams | "187" |
| `variant_length` | Number | ❌ | Length in mm | "146.6" |
| `variant_width` | Number | ❌ | Width in mm | "70.6" |
| `variant_height` | Number | ❌ | Height in mm | "8.25" |
| `variant_thresholdQty` | Number | ❌ | Low stock threshold | "5" |
| `variant_shipping` | Boolean | ❌ | Shipping enabled | "true", "false" |
| `variant_isDefault` | Boolean | ❌ | Default variant | "true", "false" |

## 📊 Sample Data Structure

### **Single Product with Multiple Variants**
```csv
title,description,category,subCategory,type,brand,variant_sku,variant_color,variant_size,variant_price,variant_qty,variant_isDefault
iPhone 15 Pro,Latest iPhone with A17 Pro chip,Electronics,Smartphones,Premium,Apple,APPLE-IP15P-128-NT,Natural Titanium,128GB,999.99,50,true
iPhone 15 Pro,Latest iPhone with A17 Pro chip,Electronics,Smartphones,Premium,Apple,APPLE-IP15P-256-NT,Natural Titanium,256GB,1199.99,30,false
iPhone 15 Pro,Latest iPhone with A17 Pro chip,Electronics,Smartphones,Premium,Apple,APPLE-IP15P-512-BT,Blue Titanium,512GB,1399.99,20,false
```

### **Multiple Products**
```csv
title,description,category,subCategory,type,brand,variant_sku,variant_color,variant_price,variant_qty,variant_isDefault
iPhone 15 Pro,Latest iPhone with A17 Pro chip,Electronics,Smartphones,Premium,Apple,APPLE-IP15P-128-NT,Natural Titanium,999.99,50,true
Samsung Galaxy S24,Latest Samsung flagship,Electronics,Smartphones,Premium,Samsung,SAMSUNG-S24-256-BK,Phantom Black,1199.99,40,true
MacBook Air M3,New MacBook with M3 chip,Electronics,Laptops,Ultrabooks,Apple,APPLE-MBA-M3-256-SG,Space Gray,1199.99,25,true
```

## 🔧 Upload Process

### **1. Access Bulk Upload**
```
Admin Panel → Products → Bulk Upload
URL: /admin/v1/products/bulk-upload
```

### **2. Download Templates**
- **Template**: Empty CSV with all headers
- **Sample Data**: CSV with example products

### **3. Prepare CSV File**
- Use UTF-8 encoding
- Ensure all required fields are filled
- Group variants by product (same title+brand)
- Set one variant as default per product

### **4. Upload Options**
- **Upload Mode**: Create (new) or Update (existing)
- **Validate Only**: Check file without importing
- **File Size**: Maximum 10MB

### **5. Review Results**
- **Success Count**: Successfully processed variants
- **Error Count**: Failed variants with reasons
- **Product Count**: Total products created/updated

## ⚠️ Validation Rules

### **Product Level**
- Title, description, category hierarchy, and brand are required
- Status must be: draft, active, inactive, or discontinued
- Featured must be true or false
- Tags separated by semicolons

### **Variant Level**
- SKU must be unique across all products
- Price and quantity must be positive numbers
- Discount price must be less than regular price
- Old price should be higher than current price
- Weight and dimensions must be positive numbers
- One variant per product must be marked as default

### **Data Integrity**
- Categories, subcategories, types, and brands are auto-created if missing
- Product slug is auto-generated from title
- Duplicate SKUs are rejected in create mode
- Empty rows are skipped

## 🚨 Common Errors & Solutions

### **❌ "Missing required CSV headers"**
**Solution**: Ensure CSV has all required headers: title, description, category, subCategory, type, brand, variant_sku, variant_price, variant_qty

### **❌ "Variant SKU already exists"**
**Solution**: Use unique SKUs or switch to update mode

### **❌ "Discount price must be less than regular price"**
**Solution**: Ensure variant_discountPrice < variant_price

### **❌ "Admin authentication required"**
**Solution**: Ensure you're logged in as admin

### **❌ "CSV file is empty"**
**Solution**: Add data rows to your CSV file

### **❌ "Row is empty"**
**Solution**: Remove empty rows or add data

## 💡 Best Practices

### **📋 CSV Preparation**
1. **Use Templates**: Start with provided templates
2. **Validate Data**: Use "Validate Only" mode first
3. **Small Batches**: Upload 50-100 products at a time
4. **Backup**: Keep original CSV files
5. **Test First**: Try with sample data

### **🎯 Product Organization**
1. **Consistent Naming**: Use consistent category/brand names
2. **Logical Grouping**: Group related variants together
3. **Default Variants**: Mark most popular variant as default
4. **SKU Convention**: Use consistent SKU naming pattern
5. **Complete Data**: Fill all relevant fields

### **🔍 Error Handling**
1. **Review Errors**: Check error messages carefully
2. **Fix and Retry**: Correct errors and re-upload
3. **Partial Success**: Successful products are saved even if others fail
4. **Log Review**: Check server logs for detailed errors

## 📈 Performance Tips

### **⚡ Upload Optimization**
- **File Size**: Keep CSV under 5MB for best performance
- **Row Limit**: Maximum 1000 rows per upload
- **Network**: Use stable internet connection
- **Browser**: Use modern browsers (Chrome, Firefox, Safari)

### **🗄️ Database Performance**
- **Indexing**: System automatically indexes SKUs
- **Validation**: Pre-validation reduces database load
- **Batching**: Products processed in groups
- **Memory**: Large uploads may take 1-2 minutes

## 🔄 Update Mode

### **Updating Existing Products**
1. Set upload mode to "Update"
2. Use existing variant SKUs
3. System finds products by variant SKU
4. Updates product and variant data
5. Creates new variants if SKU not found

### **Update Behavior**
- **Existing Variants**: Updated with new data
- **New Variants**: Added to existing product
- **Product Data**: Updated from first variant row
- **Categories**: Updated if changed

## 📊 API Integration

### **Programmatic Upload**
```bash
POST /admin/v1/products/bulk-upload
Content-Type: multipart/form-data

Form Data:
- csvFile: [CSV file]
- uploadMode: "create" | "update"
- validateOnly: true | false
```

### **Response Format**
```json
{
  "success": true,
  "message": "Upload completed: 15 variants processed, 2 errors",
  "stats": {
    "total": 17,
    "success": 15,
    "errors": 2,
    "products": 5,
    "validateOnly": false
  },
  "results": [...],
  "errors": [...]
}
```

---

## 🎯 Quick Start Checklist

- [ ] Download template CSV
- [ ] Fill product and variant data
- [ ] Ensure all required fields are complete
- [ ] Use unique SKUs for each variant
- [ ] Mark one variant as default per product
- [ ] Validate CSV using "Validate Only" mode
- [ ] Upload CSV in create mode
- [ ] Review results and fix any errors
- [ ] Verify products in admin panel

---

*Last Updated: January 2025*  
*Version: 2.0 - Enhanced Variant Support*