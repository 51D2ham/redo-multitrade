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
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ skipEmptyLines: true, skipLinesWithError: true }))
        .on('data', (data) => {
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

    for (const row of csvData) {
      processedCount++;

      try {
        const validationResult = await validateRow(row, processedCount, uploadMode);
        if (!validationResult.isValid) {
          errors.push({
            row: processedCount,
            errors: validationResult.errors,
            data: row
          });
          errorCount++;
          continue;
        }

        if (validateOnly) {
          results.push({
            row: processedCount,
            status: 'valid',
            data: row
          });
          successCount++;
          continue;
        }

        const adminId = req.admin?._id || req.user?._id;
        const productData = await buildProductData(row, adminId);
        
        let product;
        if (uploadMode === 'update') {
          const existingProduct = await Product.findOne({ 'variants.sku': row.sku });
          if (existingProduct) {
            Object.assign(existingProduct, productData);
            product = await existingProduct.save();
          } else {
            product = new Product(productData);
            await product.save();
          }
        } else {
          product = new Product(productData);
          await product.save();
        }

        results.push({
          row: processedCount,
          status: 'success',
          productId: product._id,
          data: row
        });
        successCount++;

      } catch (error) {
        console.error(`Error processing row ${processedCount}:`, error);
        errors.push({
          row: processedCount,
          errors: [error.message],
          data: row
        });
        errorCount++;
      }
    }

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const response = {
      success: errorCount === 0,
      message: validateOnly 
        ? `Validation completed: ${successCount} valid, ${errorCount} errors`
        : `Upload completed: ${successCount} products processed, ${errorCount} errors`,
      stats: {
        total: processedCount,
        success: successCount,
        errors: errorCount,
        validateOnly
      },
      results,
      errors: errors.slice(0, 50)
    };

    res.json(response);

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + error.message 
    });
  }
};

async function validateRow(row, rowNumber, uploadMode) {
  const errors = [];
  
  const requiredFields = ['title', 'description', 'category', 'subCategory', 'type', 'brand', 'sku', 'price', 'qty'];
  
  for (const field of requiredFields) {
    const value = row[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  if (row.price && isNaN(parseFloat(row.price))) {
    errors.push('Price must be a valid number');
  }

  if (row.discountPrice && isNaN(parseFloat(row.discountPrice))) {
    errors.push('Discount price must be a valid number');
  }

  if (row.qty && isNaN(parseInt(row.qty))) {
    errors.push('Quantity must be a valid integer');
  }

  if (row.price && row.discountPrice) {
    const price = parseFloat(row.price);
    const discountPrice = parseFloat(row.discountPrice);
    if (discountPrice >= price) {
      errors.push('Discount price must be less than regular price');
    }
  }

  if (row.sku && uploadMode === 'create') {
    const existingProduct = await Product.findOne({ 'variants.sku': row.sku });
    if (existingProduct) {
      errors.push(`SKU '${row.sku}' already exists`);
    }
  }

  if (row.status && !['draft', 'active', 'inactive', 'discontinued'].includes(row.status)) {
    errors.push('Status must be one of: draft, active, inactive, discontinued');
  }

  if (row.featured && !['true', 'false', ''].includes(row.featured.toLowerCase())) {
    errors.push('Featured must be true or false');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function buildProductData(row, adminId) {
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  let category = await Category.findOne({ name: { $regex: new RegExp(row.category, 'i') } });
  if (!category) {
    category = new Category({ 
      name: row.category,
      slug: generateSlug(row.category),
      admin: adminId 
    });
    await category.save();
  }

  let subCategory = await SubCategory.findOne({ 
    name: { $regex: new RegExp(row.subCategory, 'i') }
  });
  if (!subCategory) {
    subCategory = new SubCategory({ 
      name: row.subCategory,
      slug: generateSlug(row.subCategory),
      category: category._id,
      admin: adminId 
    });
    await subCategory.save();
  }

  let type = await Type.findOne({ 
    name: { $regex: new RegExp(row.type, 'i') }
  });
  if (!type) {
    type = new Type({ 
      name: row.type,
      slug: generateSlug(row.type),
      category: category._id,
      subCategory: subCategory._id,
      admin: adminId 
    });
    await type.save();
  }

  let brand = await Brand.findOne({ name: { $regex: new RegExp(row.brand, 'i') } });
  if (!brand) {
    brand = new Brand({ 
      name: row.brand,
      slug: generateSlug(row.brand),
      admin: adminId 
    });
    await brand.save();
  }

  let slug = generateSlug(row.title);
  const existingSlug = await Product.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  const variant = {
    sku: row.sku,
    price: parseFloat(row.price),
    qty: parseInt(row.qty),
    thresholdQty: row.thresholdQty ? parseInt(row.thresholdQty) : 5,
    isDefault: true,
    shipping: true
  };

  if (row.discountPrice) variant.discountPrice = parseFloat(row.discountPrice);
  if (row.oldPrice) variant.oldPrice = parseFloat(row.oldPrice);
  if (row.color) variant.color = row.color;
  if (row.size) variant.size = row.size;
  if (row.material) variant.material = row.material;
  if (row.weight) variant.weight = parseFloat(row.weight);

  const productData = {
    title: row.title,
    slug: slug,
    description: row.description,
    shortDescription: row.shortDescription || '',
    price: parseFloat(row.price),
    category: category._id,
    subCategory: subCategory._id,
    type: type._id,
    brand: brand._id,
    variants: [variant],
    status: row.status || 'draft',
    featured: row.featured === 'true',
    admin: adminId
  };

  if (row.warranty) productData.warranty = row.warranty;
  if (row.returnPolicy) productData.returnPolicy = row.returnPolicy;
  if (row.shippingInfo) productData.shippingInfo = row.shippingInfo;
  if (row.tags) {
    productData.tags = row.tags.split(';').map(tag => tag.trim()).filter(tag => tag);
  }

  return productData;
}

module.exports = exports;