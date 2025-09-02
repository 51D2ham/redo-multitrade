const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Product } = require('../models/productModel');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');

exports.showBulkUpload = async (req, res) => {
  try {
    res.render('products/bulk-upload', {
      title: 'Bulk Product Upload',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error showing bulk upload page:', error);
    req.flash('error', 'Error loading bulk upload page');
    res.redirect('/admin/v1/products');
  }
};

exports.downloadTemplate = (req, res) => {
  const templatePath = path.join(__dirname, '../../sample_data/product_upload_template.csv');
  res.download(templatePath, 'product_upload_template.csv');
};

exports.downloadSample = (req, res) => {
  const samplePath = path.join(__dirname, '../../sample_data/product_sample_data.csv');
  res.download(samplePath, 'product_sample_data.csv');
};

exports.processBulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const { uploadMode = 'create', validateOnly = false } = req.body;
    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    const csvData = [];
    let csvHeaders = [];
    
    await new Promise((resolve, reject) => {
      let isFirstRow = true;
      fs.createReadStream(req.file.path)
        .pipe(csv({ skipEmptyLines: true, skipLinesWithError: true }))
        .on('data', (data) => {
          if (isFirstRow) {
            csvHeaders = Object.keys(data);
            isFirstRow = false;
            
            // Validate required headers
            const requiredHeaders = ['title', 'description', 'category', 'subCategory', 'type', 'brand', 'variant_sku', 'variant_price', 'stock'];
            console.log('CSV Headers found:', csvHeaders);
            const missingHeaders = requiredHeaders.filter(header => 
              !csvHeaders.some(csvHeader => csvHeader.toLowerCase().trim() === header.toLowerCase())
            );
            console.log('Missing headers:', missingHeaders);
            
            if (missingHeaders.length > 0) {
              return reject(new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`));
            }
          }
          
          const cleanData = {};
          Object.keys(data).forEach(key => {
            const cleanKey = key.trim();
            const cleanValue = data[key] ? data[key].toString().trim() : '';
            cleanData[cleanKey] = cleanValue;
          });
          csvData.push(cleanData);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    if (csvData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or contains no valid data'
      });
    }

    // Group rows by product title to handle multiple variants
    const productGroups = {};
    csvData.forEach((row, index) => {
      const productKey = `${row.title}-${row.brand}`.toLowerCase();
      if (!productGroups[productKey]) {
        productGroups[productKey] = {
          baseProduct: row,
          variants: [],
          rowNumbers: []
        };
      }
      productGroups[productKey].variants.push(row);
      productGroups[productKey].rowNumbers.push(index + 1);
    });

    for (const [productKey, group] of Object.entries(productGroups)) {
      try {
        // Validate all variants for this product
        const variantValidations = [];
        for (let i = 0; i < group.variants.length; i++) {
          const row = group.variants[i];
          const rowNumber = group.rowNumbers[i];
          processedCount++;
          
          const validationResult = await validateVariantRow(row, rowNumber, uploadMode);
          variantValidations.push({ row, rowNumber, validation: validationResult });
          
          if (!validationResult.isValid) {
            errors.push({
              row: rowNumber,
              errors: validationResult.errors,
              data: row
            });
            errorCount++;
          }
        }

        // Skip product if any variant has validation errors
        const hasValidationErrors = variantValidations.some(v => !v.validation.isValid);
        if (hasValidationErrors) {
          continue;
        }

        if (validateOnly) {
          variantValidations.forEach(v => {
            results.push({
              row: v.rowNumber,
              status: 'valid',
              data: v.row
            });
            successCount++;
          });
          continue;
        }

        const adminId = req.session?.admin?.id || req.session?.admin?._id || req.user?._id;
        console.log('Admin ID extracted:', adminId);
        console.log('Session admin:', req.session?.admin);
        if (!adminId) {
          throw new Error('Admin authentication required');
        }

        // Build product with all variants
        console.log('Building product for group:', productKey);
        console.log('Variants count:', group.variants.length);
        const productData = await buildProductWithVariants(group.variants, adminId, uploadMode);
        console.log('Product data built:', JSON.stringify(productData, null, 2));
        
        let product;
        if (uploadMode === 'update') {
          // Check if product exists by title and brand combination
          const existingProduct = await Product.findOne({ 
            title: { $regex: new RegExp(`^${productData.title}$`, 'i') },
            brand: productData.brand
          });
          
          if (existingProduct) {
            // Merge variants instead of replacing
            const existingSkus = existingProduct.variants.map(v => v.sku);
            
            // Update existing variants and add new ones
            productData.variants.forEach(newVariant => {
              const existingVariantIndex = existingProduct.variants.findIndex(v => v.sku === newVariant.sku);
              if (existingVariantIndex >= 0) {
                existingProduct.variants[existingVariantIndex] = newVariant;
              } else {
                existingProduct.variants.push(newVariant);
              }
            });
            
            // Update other product fields
            Object.assign(existingProduct, {
              ...productData,
              variants: existingProduct.variants
            });
            
            product = await existingProduct.save();
          } else {
            product = new Product(productData);
            await product.save();
          }
        } else {
          console.log('Creating new product with data:', productData);
          product = new Product(productData);
          console.log('Product instance created, attempting save...');
          await product.save();
          console.log('Product saved successfully:', product._id);
        }

        // Add success results for all variants
        variantValidations.forEach(v => {
          results.push({
            row: v.rowNumber,
            status: 'success',
            productId: product._id,
            data: v.row
          });
          successCount++;
        });

      } catch (error) {
        console.error(`Error processing product group ${productKey}:`, {
          error: error.message,
          stack: error.stack,
          variants: group.variants.length,
          productData: productData || 'Not created'
        });
        
        // Add errors for all variants in this group
        group.rowNumbers.forEach((rowNumber, index) => {
          errors.push({
            row: rowNumber,
            errors: [error.message || 'Unknown error occurred'],
            data: group.variants[index]
          });
          errorCount++;
        });
      }
    }

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const response = {
      success: errorCount === 0,
      message: validateOnly 
        ? `Validation completed: ${successCount} valid, ${errorCount} errors`
        : `Upload completed: ${successCount} variants processed, ${errorCount} errors`,
      stats: {
        total: processedCount,
        success: successCount,
        errors: errorCount,
        products: Object.keys(productGroups).length,
        validateOnly
      },
      results,
      errors: errors.slice(0, 50)
    };

    res.json(response);

  } catch (error) {
    console.error('Bulk upload error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + error.message,
      error: error.stack
    });
  }
};

async function validateVariantRow(row, rowNumber, uploadMode) {
  const errors = [];
  
  // Check if row has any data
  const hasData = Object.values(row).some(value => value && value.toString().trim() !== '');
  if (!hasData) {
    errors.push('Row is empty');
    return { isValid: false, errors };
  }
  
  const requiredFields = ['title', 'description', 'category', 'subCategory', 'type', 'brand', 'variant_sku', 'variant_price', 'stock'];
  
  for (const field of requiredFields) {
    const value = row[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  // Validate variant price
  if (row.variant_price && isNaN(parseFloat(row.variant_price))) {
    errors.push('Variant price must be a valid number');
  }

  // Skip variant_discountPrice validation - not in product model

  // Validate variant old price
  if (row.variant_oldPrice && isNaN(parseFloat(row.variant_oldPrice))) {
    errors.push('Variant old price must be a valid number');
  }

  // Validate stock quantity
  if (row.stock && isNaN(parseInt(row.stock))) {
    errors.push('Stock quantity must be a valid integer');
  }

  // Validate low stock alert threshold
  if (row.lowStockAlert && isNaN(parseInt(row.lowStockAlert))) {
    errors.push('Low stock alert must be a valid integer');
  }

  // Validate variant weight
  if (row.variant_weight && isNaN(parseFloat(row.variant_weight))) {
    errors.push('Variant weight must be a valid number');
  }

  // Validate variant dimensions
  if (row.variant_length && isNaN(parseFloat(row.variant_length))) {
    errors.push('Variant length must be a valid number');
  }
  if (row.variant_width && isNaN(parseFloat(row.variant_width))) {
    errors.push('Variant width must be a valid number');
  }
  if (row.variant_height && isNaN(parseFloat(row.variant_height))) {
    errors.push('Variant height must be a valid number');
  }

  // Skip variant_discountPrice validation - not in product model

  if (row.variant_price && row.variant_oldPrice) {
    const price = parseFloat(row.variant_price);
    const oldPrice = parseFloat(row.variant_oldPrice);
    if (price > oldPrice) {
      errors.push('Variant old price should be higher than current price');
    }
  }

  // Validate SKU uniqueness for create mode
  if (row.variant_sku) {
    if (uploadMode === 'create') {
      const existingProduct = await Product.findOne({ 'variants.sku': row.variant_sku });
      if (existingProduct) {
        errors.push(`Variant SKU '${row.variant_sku}' already exists`);
      }
    }
    // For update mode, allow existing SKUs but warn about potential overwrites
  }

  // Validate product status
  if (row.status && !['draft', 'active', 'inactive'].includes(row.status)) {
    errors.push('Status must be one of: draft, active, inactive');
  }

  // Validate featured flag
  if (row.featured && !['true', 'false', ''].includes(row.featured.toLowerCase())) {
    errors.push('Featured must be true or false');
  }

  // Validate variant shipping flag
  if (row.variant_shipping && !['true', 'false', ''].includes(row.variant_shipping.toLowerCase())) {
    errors.push('Variant shipping must be true or false');
  }

  // Validate variant default flag
  if (row.variant_isDefault && !['true', 'false', ''].includes(row.variant_isDefault.toLowerCase())) {
    errors.push('Variant isDefault must be true or false');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function buildProductWithVariants(variantRows, adminId, uploadMode) {
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const baseRow = variantRows[0]; // Use first row for base product data

  // Create or find category hierarchy
  let category = await Category.findOne({ name: { $regex: new RegExp(baseRow.category, 'i') } });
  if (!category) {
    category = new Category({ 
      name: baseRow.category,
      admin: adminId 
    });
    await category.save();
  }

  let subCategory = await SubCategory.findOne({ 
    name: { $regex: new RegExp(baseRow.subCategory, 'i') },
    category: category._id
  });
  if (!subCategory) {
    subCategory = new SubCategory({ 
      name: baseRow.subCategory,
      category: category._id,
      admin: adminId 
    });
    await subCategory.save();
  }

  let type = await Type.findOne({ 
    name: { $regex: new RegExp(baseRow.type, 'i') },
    category: category._id,
    subCategory: subCategory._id
  });
  if (!type) {
    type = new Type({ 
      name: baseRow.type,
      category: category._id,
      subCategory: subCategory._id,
      admin: adminId 
    });
    await type.save();
  }

  let brand = await Brand.findOne({ name: { $regex: new RegExp(baseRow.brand, 'i') } });
  if (!brand) {
    brand = new Brand({ 
      name: baseRow.brand,
      admin: adminId 
    });
    await brand.save();
  }

  // Generate unique slug
  let slug = generateSlug(baseRow.title);
  const existingSlug = await Product.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  // Build variants array
  const variants = [];
  let hasDefaultVariant = false;
  let minPrice = Infinity;
  let maxPrice = 0;
  let totalStock = 0;

  for (let i = 0; i < variantRows.length; i++) {
    const row = variantRows[i];
    const isDefault = row.variant_isDefault === 'true' || (!hasDefaultVariant && i === 0);
    
    if (isDefault) hasDefaultVariant = true;

    const variant = {
      sku: row.variant_sku,
      price: parseFloat(row.variant_price),
      stock: parseInt(row.stock) || 0,
      lowStockAlert: row.lowStockAlert ? parseInt(row.lowStockAlert) : 5,
      isDefault: isDefault,
      shipping: row.variant_shipping !== 'false'
    };

    // Optional variant fields
    if (row.variant_oldPrice) variant.originalPrice = parseFloat(row.variant_oldPrice);
    if (row.variant_color) variant.color = row.variant_color;
    if (row.variant_size) variant.size = row.variant_size;
    if (row.variant_material) variant.material = row.variant_material;
    if (row.variant_weight) variant.weight = parseFloat(row.variant_weight);
    
    // Variant dimensions as string
    if (row.variant_length || row.variant_width || row.variant_height) {
      const dims = [];
      if (row.variant_length) dims.push(`${row.variant_length}`);
      if (row.variant_width) dims.push(`${row.variant_width}`);
      if (row.variant_height) dims.push(`${row.variant_height}`);
      if (dims.length > 0) variant.dimensions = dims.join(' x ') + ' cm';
    }

    variants.push(variant);

    // Calculate product-level aggregates
    minPrice = Math.min(minPrice, variant.price);
    maxPrice = Math.max(maxPrice, variant.price);
    totalStock += variant.stock;
  }

  // Build product data
  const productData = {
    title: baseRow.title,
    slug: slug,
    description: baseRow.description,
    shortDescription: baseRow.shortDescription || '',
    images: ['/uploads/products/placeholder.jpg'],
    category: category._id,
    subCategory: subCategory._id,
    type: type._id,
    brand: brand._id,
    variants: variants,
    status: baseRow.status || 'draft',
    featured: baseRow.featured === 'true',
    admin: adminId
  };

  // Optional product fields
  if (baseRow.warranty) productData.warranty = baseRow.warranty;
  if (baseRow.returnPolicy) productData.returnPolicy = baseRow.returnPolicy;
  if (baseRow.shippingInfo) productData.shippingInfo = baseRow.shippingInfo;
  if (baseRow.tags) {
    productData.tags = baseRow.tags.split(';').map(tag => tag.trim()).filter(tag => tag);
  }

  return productData;
}

module.exports = exports;