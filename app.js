require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const cors = require('cors');
const connectDb = require('./src/config/connectDb');
const { securityHeaders, generateCSRFToken, createRateLimit } = require('./src/middlewares/security');

const app = express();
const port = process.env.PORT || 9001;

// Generate CSP nonce first
app.use((req, res, next) => {
  if (!res.locals.cspNonce) {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  next();
});

// Security middleware
app.use(securityHeaders);
app.use(createRateLimit());

// CORS & Express setup
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
}));

app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

// Static files & uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(methodOverride('_method'));
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads'), { maxAge: '7d' }));
app.use('/uploads', express.static(uploadsPath, { maxAge: '7d' }));


// Session
app.use(session({
  name: 'multitrade.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.CONNECTION_STRING,
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());
app.use(generateCSRFToken);

// CSRF Protection - Only for admin routes (after body parsing)
const { csrfProtection } = require('./src/middlewares/security');
// Apply CSRF after routes are loaded so multer can process multipart data first

// Global middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Request logging (only for errors and important routes)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_REQUESTS === 'true') {
    console.log(`${req.method} ${req.originalUrl}`);
  }
  next();
});

// Route imports
const customerApiRouter = require('./src/routes/v1/customer/api');
const customerRenderRouter = require('./src/routes/v1/customer/render');
const adminRenderRouter = require('./src/routes/v1/admin/render');
const orderManagementRoutes = require('./src/routes/v1/order');
const orderManagementApiRoutes = require('./src/routes/v1/order/api');
const cartApiRoutes = require('./src/routes/v1/cart/api');
const wishlistApiRoutes = require('./src/routes/v1/wishlist/api');
const productRoutes = require('./src/routes/v1/products/render');
const productApiRoutes = require('./src/routes/v1/products/api');
const bulkUploadRoutes = require('./src/routes/bulkUploadRoutes');
const adminReviewRoutes = require('./src/routes/v1/reviews/render');
const categoryRoutes = require('./src/routes/v1/categories/render');
const categoryRoutesApi = require('./src/routes/v1/categories/api');
const subCategoryRoutes = require('./src/routes/v1/subCategories/render');
const subCategoryRoutesApi = require('./src/routes/v1/subCategories/api');
const typeRoutes = require('./src/routes/v1/types/render');
const typeRoutesApi = require('./src/routes/v1/types/api');
const brandRoutes = require('./src/routes/v1/brands/render');
const brandRoutesApi = require('./src/routes/v1/brands/api');
const specListRoutes = require('./src/routes/v1/specList/render');
const specListApiRoutes = require('./src/routes/v1/specList/api');
const heroCarouselRoutes = require('./src/routes/v1/heroCarousel/render');
const heroCarouselApiRoutes = require('./src/routes/v1/heroCarousel/api');
const adsPanelRoutes = require('./src/routes/v1/adsPanel/render');
const adsPanelApiRoutes = require('./src/routes/v1/adsPanel/api');
const companyInfoRoutes = require('./src/routes/v1/companyInfo/render');
const companyInfoApiRoutes = require('./src/routes/v1/companyInfo/api');
const inventoryRoutes = require('./src/routes/v1/inventory/render');
const inventoryApiRoutes = require('./src/routes/v1/inventory/api');
const parameterPosterRoutes = require('./src/routes/v1/parameterPosters');
const parameterPosterApiRoutes = require('./src/routes/v1/parameterPosters/api');
const brandCarouselRoutes = require('./src/routes/v1/brandCarousel/render');
const brandCarouselApiRoutes = require('./src/routes/v1/brandCarousel/api');
const salesReport = require('./src/routes/salesRoutes');
const reviewsApi = require('./src/routes/v1/reviews/api');

// API Routes
app.use('/api/v1/customers', customerApiRouter);
app.use('/api/v1/cart', cartApiRoutes);
app.use('/api/v1/wishlist', wishlistApiRoutes);
app.use('/api/v1/orders',orderManagementApiRoutes);
app.use('/api/v1/products', productApiRoutes);
app.use('/api/v1/reviews', reviewsApi);
app.use('/api/v1/categories', categoryRoutesApi);
app.use('/api/v1/subcategories', subCategoryRoutesApi);
app.use('/api/v1/types',typeRoutesApi);
app.use('/api/v1/brands', brandRoutesApi);
app.use('/api/v1/spec-lists', specListApiRoutes);
app.use('/api/v1/hero-carousel', heroCarouselApiRoutes);
app.use('/api/v1/ads-panel', adsPanelApiRoutes);
app.use('/api/v1/company-info', companyInfoApiRoutes);
app.use('/api/v1/inventory', inventoryApiRoutes);
app.use('/api/v1/parameter-posters', parameterPosterApiRoutes);
app.use('/api/v1/brand-carousel', brandCarouselApiRoutes);

// Admin Routes (specific first) - CSRF protection applied in individual routes
app.use('/admin/v1/products/bulk-upload', bulkUploadRoutes);
app.use('/admin/v1/products', productRoutes);
app.use('/admin/v1/reviews', adminReviewRoutes);
app.use('/admin/v1/customers', customerRenderRouter);
app.use('/admin/v1/staff', adminRenderRouter);
app.use('/admin/v1/parameters/categories', categoryRoutes);
app.use('/admin/v1/parameters/subcategories', subCategoryRoutes);
app.use('/admin/v1/parameters/types', typeRoutes);
app.use('/admin/v1/parameters/brands', brandRoutes);
app.use('/admin/v1/parameters/spec-lists', specListRoutes);
app.use('/admin/v1/parameters/hero-carousel', heroCarouselRoutes);
app.use('/admin/v1/parameters/ads-panel', adsPanelRoutes);
app.use('/admin/v1/parameters/company-info', companyInfoRoutes);
app.use('/admin/v1/content/parameter-posters', parameterPosterRoutes);
app.use('/admin/v1/content/brand-carousel', brandCarouselRoutes);
app.use('/admin/v1/order', orderManagementRoutes);
app.use('/admin/inventory', inventoryRoutes);
app.use('/admin/v1/inventory', inventoryRoutes);

// Dashboard redirects
app.get('/admin/dashboard', (req, res) => res.redirect('/admin/reports/comprehensive'));
app.get('/dashboard', (req, res) => res.redirect('/admin/reports/comprehensive'));
app.get('/admin/v1/parameters', (req, res) => res.redirect('/admin/v1/staff/parameter-dashboard'));
app.get('/', (req, res) => res.redirect('/admin/reports/comprehensive'));

// Reports 
app.use('/admin', salesReport);
app.use('/admin/reports', require('./src/routes/reportsRoutes'));
app.use('/admin/dashboard', require('./src/routes/dashboardRoutes'));

// Error handlers
app.use((req, res) => {
  if (!res.locals.cspNonce) {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    message: 'The requested page could not be found'
  });
});

app.use((err, req, res, next) => {
  console.error(`${err.status || 500} Error: ${err.message}`);
  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;
  
  if (!res.locals.cspNonce) {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  
  res.status(statusCode).render('errors/generic', {
    title: `${statusCode} Error`,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDb();
    
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();