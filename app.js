require('dotenv').config();

// Suppress deprecation warnings
process.noDeprecation = true;
const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const connectDb = require('./src/config/connectDb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 9001;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

// static things 
const publicPath = path.join(__dirname, 'src', 'public'); //css and js 
const srcUploadsPath = path.join(__dirname, 'src', 'uploads'); // img at src/upload 
const publicUploadsPath = path.join(__dirname, 'public', 'uploads'); //img at public/uploads 

[publicUploadsPath, srcUploadsPath].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// Static files
app.use(express.static(publicPath, { maxAge: '1d' })); 
app.use('/uploads', express.static(srcUploadsPath));  // Check src/uploads first
app.use('/uploads', express.static(publicUploadsPath)); // Then check public/uploads

// session cookies 
app.use(session({
  name: 'ecom.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.CONNECTION_STRING,
    ttl: 1 * 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1 * 24 * 60 * 60 * 1000
  }
}));

app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;
  res.locals.currentPath = req.path;
  
  // Generate nonce for CSP if not already set by auth middleware
  if (!res.locals.cspNonce) {
    const crypto = require('crypto');
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;
    
    // Set permissive CSP for development
    res.set('Content-Security-Policy', 
      `default-src 'self' 'unsafe-inline' 'unsafe-eval'; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ` +
      `style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ` +
      `font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; ` +
      `img-src 'self' data: blob:;`
    );
  }
  
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.body && req.body._method) {
    console.log('Method override detected:', req.body._method);
  }
  next();
});

// ROUTES - CORRECTED: Using proper separate route files
const customerApiRouter = require('./src/routes/v1/customer/api');
const customerRenderRouter = require('./src/routes/v1/customer/render');
const adminRenderRouter = require('./src/routes/v1/admin/render');
const orderManagementRoutes = require('./src/routes/v1/order');
const salesReport = require('./src/routes/salesRoutes');

const categoryRoutes = require('./src/routes/v1/categories/render');
const subCategoryRoutes = require('./src/routes/v1/subCategories/render');
const typeRoutes = require('./src/routes/v1/types/render');
const brandRoutes = require('./src/routes/v1/brands/render');
const heroCarouselRoutes = require('./src/routes/v1/heroCarousel/render');
const heroCarouselApiRoutes = require('./src/routes/v1/heroCarousel/api');
const specListRoutes = require('./src/routes/v1/specList/render');
const specListApiRoutes = require('./src/routes/v1/specList/api');
const productRoutes = require('./src/routes/v1/products/render');
const productApiRoutes = require('./src/routes/v1/products/api');
const bulkUploadRoutes = require('./src/routes/bulkUploadRoutes');
const adminReviewRoutes = require('./src/routes/v1/reviews/render');
const wishlistApiRoutes = require('./src/routes/v1/wishlist');
const cartApiRoutes = require('./src/routes/v1/cart');

const inventoryRoutes = require('./src/routes/v1/inventory/render');
const inventoryApiRoutes = require('./src/routes/v1/inventory/api');


// API routes
app.use('/api/v1/customers', customerApiRouter);
app.use('/api/v1/wishlist', wishlistApiRoutes); 
app.use('/api/v1/categories', require('./src/routes/v1/categories/api'));
app.use('/api/v1/subcategories', require('./src/routes/v1/subCategories/api'));
app.use('/api/v1/types', require('./src/routes/v1/types/api'));
app.use('/api/v1/brands', require('./src/routes/v1/brands/api'));
app.use('/api/v1/hero-carousel', heroCarouselApiRoutes);
app.use('/api/v1/cart', cartApiRoutes);
app.use('/api/v1/cart', cartApiRoutes);
app.use('/api/v1/orders', require('./src/routes/v1/order/api'));
app.use('/api/v1/spec-lists', specListApiRoutes);
app.use('/api/v1/products', productApiRoutes);
app.use('/api/v1/reviews', require('./src/routes/v1/reviews/api'));

// Admin routes - SPECIFIC routes MUST come before generic /admin routes
app.use('/admin/v1/products/bulk-upload', bulkUploadRoutes);
app.use('/admin/v1/products', productRoutes);
app.use('/admin/v1/reviews', adminReviewRoutes);
app.use('/admin/v1/parameters/spec-lists', specListRoutes);
app.use('/admin/v1/customers', customerRenderRouter);
app.use('/admin/v1/staff', adminRenderRouter);
app.use('/admin/v1/parameters/categories', categoryRoutes);
app.use('/admin/v1/parameters/subcategories', subCategoryRoutes);
app.use('/admin/v1/parameters/types', typeRoutes);
app.use('/admin/v1/parameters/brands', brandRoutes);
app.use('/admin/v1/parameters/hero-carousel', heroCarouselRoutes);

// Direct test route
app.get('/admin/inventory-test', (req, res) => {
  res.send('Direct inventory route works!');
});

// Dashboard route - use existing comprehensive report
app.get('/admin/dashboard', (req, res) => {
  res.redirect('/admin/reports/comprehensive');
});
app.get('/dashboard', (req, res) => {
  res.redirect('/admin/reports/comprehensive');
});

// Inventory routes - Remove these as they're handled by the inventory routes below

// These generic /admin routes must come AFTER specific routes
app.use('/admin/inventory', inventoryRoutes);
app.use('/api/v1/inventory', inventoryApiRoutes);
app.use('/admin/v1/order', orderManagementRoutes);
// IMPORTANT: This catches all /admin/* routes, so it must be LAST
app.use('/admin', salesReport);

// Parameters redirect
app.get('/admin/v1/parameters', (req, res) => {
  res.redirect('/admin/v1/staff/parameter-dashboard');
});

// Root route
app.get('/', (req, res) => {
  res.redirect('/admin/reports/comprehensive');
});

// 404 handler
app.use((req, res) => {
  // Ensure cspNonce is available for 404 template
  if (!res.locals.cspNonce) {
    const crypto = require('crypto');
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    message: 'The requested page could not be found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', new Date().toISOString(), err);
  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Something went wrong' : err.message;
  
  // Ensure cspNonce is available for error templates
  if (!res.locals.cspNonce) {
    const crypto = require('crypto');
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  
  res.status(statusCode).render('errors/generic', {
    title: `${statusCode} Error`,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

const startServer = async () => {
  await connectDb();
  app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});