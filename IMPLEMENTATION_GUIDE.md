# Security Implementation Guide

## Step 1: Install Required Security Packages

```bash
npm install helmet express-rate-limit express-mongo-sanitize csurf validator escape-html
```

## Step 2: Update app.js with Security Middleware

Add these imports at the top of app.js:

```javascript
const { securityHeaders, apiLimiter, mongoSanitize, sanitizeInput } = require('./src/middlewares/security');
const csrf = require('csurf');
```

Add these middleware after existing middleware in app.js:

```javascript
// Security middleware
app.use(securityHeaders);
app.use(mongoSanitize);
app.use(sanitizeInput);

// Rate limiting
app.use('/api/', apiLimiter);

// CSRF protection for admin routes
const csrfProtection = csrf({ cookie: true });
app.use('/admin', csrfProtection);

// Make CSRF token available to all admin views
app.use('/admin', (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

## Step 3: Update Environment Variables

Add to your .env file:

```env
# Security Settings
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h
SESSION_TIMEOUT=86400000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CSRF_SECRET=your-csrf-secret-key-here

# File Upload Limits
MAX_FILE_SIZE=5242880
MAX_FILES_PER_REQUEST=10
```

## Step 4: Update Admin Forms with CSRF Tokens

In all admin EJS templates, add CSRF token to forms:

```html
<form method="POST" action="/admin/...">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <!-- rest of form -->
</form>
```

## Step 5: Update Database Queries

Replace direct user input in queries with sanitized versions:

```javascript
// Before (vulnerable)
const products = await Product.find({ title: { $regex: req.query.search, $options: 'i' } });

// After (secure)
const mongoSanitize = require('mongo-sanitize');
const searchTerm = mongoSanitize(req.query.search);
const products = await Product.find({ title: { $regex: searchTerm, $options: 'i' } });
```

## Step 6: Update File Upload Middleware

Replace existing multer configurations with secure versions:

```javascript
const { validateFileUpload } = require('./middlewares/security');

// Apply to upload routes
router.post('/upload', upload.array('images', 10), validateFileUpload(), controller);
```

## Step 7: Add Authorization Middleware

Create role-based access control:

```javascript
// In middlewares/auth.js
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Apply to sensitive routes
router.delete('/admin/users/:id', requireRole(['superadmin']), deleteUser);
```

## Step 8: Update Logging

Replace all console.log statements that include user input:

```javascript
// Before (vulnerable)
console.log(`User ${username} logged in`);

// After (secure)
console.log(`User ${encodeURIComponent(username)} logged in`);
```

## Step 9: Testing Checklist

After implementation, test:

- [ ] CSRF protection on all admin forms
- [ ] Rate limiting on API endpoints
- [ ] File upload restrictions
- [ ] Input sanitization
- [ ] Path traversal protection
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Authorization checks

## Step 10: Monitoring and Alerts

Set up monitoring for:
- Failed authentication attempts
- Rate limit violations
- File upload errors
- Security header violations
- Suspicious database queries

## Additional Recommendations

1. **Regular Security Audits**: Run `npm audit` regularly
2. **Dependency Updates**: Keep all packages updated
3. **Security Headers**: Implement additional security headers
4. **Logging**: Implement comprehensive security logging
5. **Backup Strategy**: Ensure secure backups
6. **SSL/TLS**: Use HTTPS in production
7. **Environment Separation**: Separate dev/staging/prod environments

## Emergency Response

If security breach detected:
1. Immediately revoke all active sessions
2. Change all secrets and keys
3. Review logs for suspicious activity
4. Notify affected users
5. Implement additional security measures
6. Conduct post-incident review