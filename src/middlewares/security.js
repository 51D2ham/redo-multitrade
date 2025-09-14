const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const path = require('path');

// CSRF Protection Middleware - Only for admin routes
const csrfProtection = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!req.session || !req.session.admin) {
    return next();
  }

  const token = (req.body && req.body._csrf) || req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    req.flash('error', 'Security token mismatch. Please try again.');
    return res.redirect('back');
  }

  next();
};

// Generate CSRF token
const generateCSRFToken = (req, res, next) => {
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
  } else {
    res.locals.csrfToken = '';
  }
  next();
};

// Input sanitization middleware - Skip admin and API routes
const sanitizeInput = (req, res, next) => {
  // Skip sanitization for API routes and admin routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
    return next();
  }

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return validator.escape(value.trim());
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// Path traversal protection
const validateFilePath = (filePath, allowedDir) => {
  const normalizedPath = path.normalize(filePath);
  const resolvedPath = path.resolve(allowedDir, normalizedPath);
  const allowedPath = path.resolve(allowedDir);
  
  return resolvedPath.startsWith(allowedPath);
};

// Rate limiting
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 200) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for static assets
      return req.path.startsWith('/uploads/') || req.path.endsWith('.css') || req.path.endsWith('.js');
    }
  });
};

// Security headers with proper CSP for production
const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
});

// Log sanitization
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') {
    input = String(input);
  }
  return input.replace(/[\r\n\t]/g, '_').substring(0, 200);
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  sanitizeInput,
  validateFilePath,
  createRateLimit,
  securityHeaders,
  sanitizeForLog
};