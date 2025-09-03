const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>\"'&\r\n\t]/g, '').trim();
};

// Validate ObjectId
const validateObjectId = (id, fieldName = 'ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return { isValid: false, message: `Invalid ${fieldName}` };
  }
  return { isValid: true };
};

// Validate email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

// Validate quantity
const validateQuantity = (qty, min = 1, max = 100) => {
  const parsedQty = parseInt(qty);
  if (isNaN(parsedQty) || parsedQty < min || parsedQty > max) {
    return { isValid: false, message: `Quantity must be between ${min} and ${max}` };
  }
  return { isValid: true, value: parsedQty };
};

// Validate price
const validatePrice = (price, min = 0) => {
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < min) {
    return { isValid: false, message: `Price must be a valid number >= ${min}` };
  }
  return { isValid: true, value: Math.round(parsedPrice * 100) / 100 };
};

// Cart validation middleware
const validateCartItem = (req, res, next) => {
  try {
    const { productId, qty, variantSku } = req.body;

    // Validate product ID
    const productValidation = validateObjectId(productId, 'Product ID');
    if (!productValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: productValidation.message
      });
    }

    // Validate quantity
    const qtyValidation = validateQuantity(qty);
    if (!qtyValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: qtyValidation.message
      });
    }

    // Sanitize variant SKU if provided
    if (variantSku) {
      req.body.variantSku = sanitizeInput(variantSku.toString());
    }

    req.body.qty = qtyValidation.value;
    next();

  } catch (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Invalid request data'
    });
  }
};

// Order validation middleware
const validateOrderData = (req, res, next) => {
  try {
    const { paymentMethod, shippingAddress, useNewAddress, addressId, cartItemIds } = req.body;

    // Validate payment method
    const validPaymentMethods = ['cod', 'online', 'card', 'paypal'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment method. Allowed: ' + validPaymentMethods.join(', ')
      });
    }

    // Validate cart item IDs if provided
    if (cartItemIds && Array.isArray(cartItemIds)) {
      const invalidIds = cartItemIds.filter(id => !validateObjectId(id).isValid);
      if (invalidIds.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid cart item IDs provided'
        });
      }
    }

    // Validate shipping address
    if (useNewAddress) {
      if (!shippingAddress || typeof shippingAddress !== 'object') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Shipping address is required'
        });
      }

      const requiredFields = ['fullname', 'street', 'city', 'state', 'postalCode', 'country', 'phone'];
      const missingFields = requiredFields.filter(field => 
        !shippingAddress[field] || !shippingAddress[field].toString().trim()
      );

      if (missingFields.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Missing required address fields: ${missingFields.join(', ')}`
        });
      }

      // Validate email if provided
      if (shippingAddress.email && !validateEmail(shippingAddress.email)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid email address'
        });
      }

      // Validate phone
      if (!validatePhone(shippingAddress.phone)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid phone number'
        });
      }

      // Sanitize address fields
      Object.keys(shippingAddress).forEach(key => {
        if (typeof shippingAddress[key] === 'string') {
          shippingAddress[key] = sanitizeInput(shippingAddress[key].trim());
        }
      });

    } else {
      // Validate address ID
      if (!addressId || !validateObjectId(addressId, 'Address ID').isValid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Valid address ID is required when using saved address'
        });
      }
    }

    next();

  } catch (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Invalid request data'
    });
  }
};

// Product validation middleware
const validateProductData = (req, res, next) => {
  try {
    const { title, description, category, subCategory, type, brand, variants } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Product title is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Product description is required'
      });
    }

    // Validate category references
    const categoryValidation = validateObjectId(category, 'Category');
    if (!categoryValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: categoryValidation.message
      });
    }

    const subCategoryValidation = validateObjectId(subCategory, 'SubCategory');
    if (!subCategoryValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: subCategoryValidation.message
      });
    }

    const typeValidation = validateObjectId(type, 'Type');
    if (!typeValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: typeValidation.message
      });
    }

    const brandValidation = validateObjectId(brand, 'Brand');
    if (!brandValidation.isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: brandValidation.message
      });
    }

    // Validate variants if provided
    if (variants && Array.isArray(variants)) {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        
        if (!variant.sku || !variant.sku.trim()) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: SKU is required`
          });
        }

        const priceValidation = validatePrice(variant.price);
        if (!priceValidation.isValid) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: ${priceValidation.message}`
          });
        }

        const stockValidation = validateQuantity(variant.stock, 0, 10000);
        if (!stockValidation.isValid) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: Stock ${stockValidation.message.toLowerCase()}`
          });
        }

        // Sanitize variant fields
        variant.sku = sanitizeInput(variant.sku.trim());
        if (variant.color) variant.color = sanitizeInput(variant.color);
        if (variant.size) variant.size = sanitizeInput(variant.size);
        if (variant.material) variant.material = sanitizeInput(variant.material);
        
        variant.price = priceValidation.value;
        variant.stock = stockValidation.value;
      }
    }

    // Sanitize text fields
    req.body.title = sanitizeInput(title.trim());
    req.body.description = sanitizeInput(description.trim());
    if (req.body.shortDescription) {
      req.body.shortDescription = sanitizeInput(req.body.shortDescription.trim());
    }

    next();

  } catch (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Invalid product data'
    });
  }
};

// Search validation middleware
const validateSearchQuery = (req, res, next) => {
  try {
    const { search, page, limit, sortBy } = req.query;

    // Sanitize search query
    if (search) {
      req.query.search = sanitizeInput(search);
      
      // Prevent overly long search queries
      if (req.query.search.length > 100) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Search query too long (max 100 characters)'
        });
      }
    }

    // Validate pagination
    if (page) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
        req.query.page = 1;
      } else {
        req.query.page = pageNum;
      }
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        req.query.limit = 20;
      } else {
        req.query.limit = limitNum;
      }
    }

    // Validate sort options
    if (sortBy) {
      const validSortOptions = [
        'priority', 'date_desc', 'date_asc', 'amount_desc', 'amount_asc',
        'price_asc', 'price_desc', 'rating', 'popular', 'newest', 'oldest'
      ];
      if (!validSortOptions.includes(sortBy)) {
        req.query.sortBy = 'priority';
      }
    }

    next();

  } catch (error) {
    next();
  }
};

module.exports = {
  validateCartItem,
  validateOrderData,
  validateProductData,
  validateSearchQuery,
  validateObjectId,
  validateEmail,
  validatePhone,
  validateQuantity,
  validatePrice,
  sanitizeInput
};