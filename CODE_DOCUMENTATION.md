# 💻 Multitrade Backend - Code Documentation

## 🏗️ Project Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT (Customer) + Session (Admin)
- **Template Engine**: EJS
- **File Upload**: Multer
- **Email**: Nodemailer (Gmail)
- **Security**: Helmet, CORS, bcrypt
- **Session Store**: connect-mongo

---

## 📁 Project Structure

```
multitrade_backend-master/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env                           # Environment variables
├── nodemon.json                   # Nodemon configuration
├── README.md                      # Project documentation
├── API_DOCUMENTATION.md           # Customer API docs
├── ADMIN_API_DOCUMENTATION.md     # Admin API docs
├── CODE_DOCUMENTATION.md          # This file
├── EXPORT_FEATURES.md             # Export functionality documentation
├── POSTMAN_API_COLLECTION.json    # Postman collection
├── public/uploads/                # Public upload directory
├── sample_data/                   # CSV templates and samples
└── src/                          # Source code directory
    ├── config/                   # Configuration files
    ├── controllers/              # Business logic controllers
    ├── middlewares/              # Custom middleware
    ├── models/                   # Database models (Mongoose)
    ├── routes/                   # API and web routes
    ├── services/                 # Business services
    ├── utils/                    # Utility functions
    ├── views/                    # EJS templates
    ├── public/                   # Static assets (CSS, JS)
    ├── uploads/                  # File uploads storage
    └── seed/                     # Database seeding scripts
```

---

## 🔧 Core Configuration

### 1. Database Configuration (`src/config/connectDb.js`)
```javascript
// MongoDB connection with error handling
const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database Connected Successfully!');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};
```

### 2. Email Configuration (`src/config/mail.js`)
```javascript
// Gmail SMTP configuration
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});
```

---

## 🗄️ Database Models

### 1. User Model (`src/models/userRegisterModel.js`)
```javascript
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 8 },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date, required: true },
  profileImage: { type: String },
  permanentAddress: { type: String },
  tempAddress: { type: String },
  resOTP: { type: String },
  OTP_Expires: { type: Date },
  tokenVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });
```

### 2. Product Model (`src/models/productModel.js`)
```javascript
const productSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  price: { type: Number, required: true, min: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  type: { type: Schema.Types.ObjectId, ref: 'Type', required: true },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true }
}, { timestamps: true });
```

### 3. Order Model (`src/models/orderModel.js`)
```javascript
const orderSchema = new Schema({
  totalPrice: { type: Number, required: true, min: 0 },
  totalItem: { type: Number, required: true, min: 0 },
  totalQty: { type: Number, required: true, min: 0 },
  discountAmt: { type: Number, default: 0, min: 0 },
  couponApplied: { type: String },
  paymentMethod: { type: String, enum: ['card', 'paypal', 'cod', 'other'], required: true },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: { type: Schema.Types.ObjectId, ref: 'ShippingAddress', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
```

---

## 🎛️ Controllers Architecture

### 1. Dashboard Controller (`src/controllers/dashboardController.js`)
**Key Functions:**
- `getMainDashboard()` - Comprehensive dashboard with mixed order analytics
- `exportDashboardExcel()` - Multi-sheet Excel export with price tracking
- `exportDashboardCSV()` - Structured CSV export with detailed metrics

### 2. Customer Controller (`src/controllers/customerRegister.js`)
**Key Functions:**
- `registerUser()` - User registration with validation
- `loginUser()` - JWT-based authentication
- `forgetPassword()` - OTP generation and email
- `resetPassword()` - Password reset with OTP verification
- `changePassword()` - Authenticated password change
- `updateUser()` - Profile updates with file handling
- `logoutUser()` - Token invalidation

### 3. Product Controller (`src/controllers/productController.js`)
**Key Functions:**
- `getAllProducts()` - Paginated product listing with filters
- `getProductById()` - Single product with reviews and specs
- `getProductFilters()` - Available filters (categories, brands, price range)
- `createProduct()` - Admin product creation
- `updateProduct()` - Admin product updates
- `deleteProduct()` - Admin product deletion

### 4. Cart Controller (`src/controllers/cartController.js`)
**Key Functions:**
- `getCart()` - User's cart with populated product data
- `addToCart()` - Add items with duplicate handling
- `updateCartItem()` - Quantity updates with validation
- `removeCartItem()` - Single item removal
- `clearCart()` - Complete cart clearing

### 5. Order Controller (`src/controllers/checkoutController.js`)
**Key Functions:**
- `checkout()` - Order creation with stock management
- `getOrderHistory()` - User's order history
- `getOrderDetails()` - Single order with status tracking
- `cancelOrder()` - Order cancellation with stock restoration

### 6. SpecList Controller (`src/controllers/specListController.js`)
**Key Functions:**
- `getAllPublicSpecLists()` - Get all active specifications
- `getProductsBySpec()` - Find products by specification value
- `searchProductsBySpec()` - Search products across specifications
- `getSpecValues()` - Get available values for a specification
- Admin CRUD operations for specification management

---

## 🔒 Middleware System

### 1. Authentication Middleware (`src/middlewares/customerAuth.js`)
```javascript
const customerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    req.userInfo = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};
```

### 2. Admin Authentication (`src/middlewares/auth.js`)
```javascript
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  } else {
    return res.redirect('/admin/v1/staff/login');
  }
};
```

### 3. Role-Based Access Control (`src/middlewares/roleAccess.js`)
```javascript
const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.session?.admin?.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    } else {
      return res.status(403).render('errors/403', { 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
  };
};
```

### 4. File Upload Middleware (`src/middlewares/productPhoto.js`)
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});
```

---

## 🛠️ Services Layer

### 1. Sales Service (`src/services/salesService.js`)
**Key Functions:**
- `getComprehensiveReport()` - Advanced sales analytics with mixed order support
- `recordSalesForDeliveredItems()` - Track sales only for delivered items
- `removeSalesForCancelledItems()` - Clean up cancelled item sales

### 2. Inventory Service (`src/services/inventoryService.js`)
**Key Functions:**
- `getDashboardData()` - Comprehensive inventory analytics with fallbacks
- `getLowStockAlerts()` - Products below threshold with priorities
- `getMovementReport()` - Stock movement history with product names
- `logMovement()` - Enhanced movement logging with validation
- `restoreStockForCancelledOrder()` - Automatic stock restoration

### 3. Mixed Order Reporting Service (`src/services/mixedOrderReportingService.js`)
**Key Functions:**
- `getOrderAnalytics()` - Advanced order fulfillment analytics
- `calculateMixedOrderMetrics()` - Revenue efficiency and fulfillment rates
- `getOrderTypeBreakdown()` - Categorize orders by fulfillment status

### 4. Order Management Service (`src/services/orderManagementService.js`)
**Key Functions:**
- `calculateOptimalOrderStatus()` - Smart order status determination
- `validateStatusTransition()` - Prevent invalid status changes
- `handleMixedOrderScenarios()` - Manage complex order states

---

## 🔍 Advanced Product Search System

### Specification-Based Product Discovery
The SpecList system enables powerful product filtering based on technical specifications, allowing users to find products by exact technical requirements.

**Architecture:**
```javascript
// Database relationships
SpecList -> ProductSpecs -> Product -> ProductInventory
```

**Search Methods:**
1. **Exact Specification Match**: Find products with specific spec values
2. **Cross-Specification Search**: Search across all specifications
3. **Value Discovery**: Get available values for any specification

### Implementation Details:

#### 1. Product Search by Specification (`getProductsBySpec`)
```javascript
// Find products with RAM = "8GB"
const productSpecs = await ProductSpecs.find({
  specList: ramSpecId,
  value: { $regex: "8GB", $options: 'i' }
}).populate('product');
```

#### 2. Cross-Specification Search (`searchProductsBySpec`)
```javascript
// Search "Black" across all specifications (Color, Material, etc.)
const productSpecs = await ProductSpecs.find({
  specList: { $in: allSpecIds },
  value: { $regex: "Black", $options: 'i' }
});
```

#### 3. Specification Values Discovery (`getSpecValues`)
```javascript
// Get all available RAM values with product counts
const values = await ProductSpecs.distinct('value');
const valuesWithCount = await Promise.all(
  values.map(async (value) => {
    const count = await ProductSpecs.countDocuments({ value });
    return { value, productCount: count };
  })
);
```

### Real-World Use Cases:

#### Electronics & Technology:
- **RAM**: Find laptops with "8GB RAM", "16GB RAM"
- **Storage**: Search for "256GB SSD", "1TB HDD"
- **Screen Size**: Filter by "15.6 inch", "13.3 inch"
- **Processor**: Find "Intel i7", "AMD Ryzen 5"

#### Fashion & Apparel:
- **Size**: Search for "Medium", "Large", "XL"
- **Color**: Filter by "Black", "Blue", "Red"
- **Material**: Find "Cotton", "Polyester", "Silk"

#### Home Appliances:
- **Capacity**: Search for "1.5 Ton AC", "7kg Washing Machine"
- **Energy Rating**: Filter by "5 Star", "3 Star"
- **Brand**: Find products by specific brands

---

## 🔧 Utility Functions

### 1. Stock Manager (`src/utils/stockManager.js`)
```javascript
class StockManager {
  static async deductStock(orderItems) {
    // Atomic stock deduction with validation
    for (const item of orderItems) {
      await ProductInventory.findOneAndUpdate(
        { 
          product: item.productId,
          qty: { $gte: item.quantity }
        },
        { 
          $inc: { qty: -item.quantity }
        }
      );
    }
  }

  static async restoreStock(orderItems, orderId, adminId) {
    // Stock restoration for cancelled orders
    for (const item of orderItems) {
      await ProductInventory.findOneAndUpdate(
        { product: item.productId },
        { $inc: { qty: item.quantity } }
      );
    }
  }
}
```

### 2. Email Templates (`src/utils/emailTemplates/`)
- `orderConfirmation.js` - Order confirmation emails
- `passwordReset.js` - Password reset emails
- `statusUpdate.js` - Order status update emails

### 3. OTP Generator (`src/utils/generateOtp.js`)
```javascript
const generateOtp = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};
```

---

## 🛣️ Routing Architecture

### 1. Route Structure
```
/api/v1/                    # Customer API routes
├── customers/              # Customer authentication
├── products/               # Product browsing
├── cart/                   # Cart management
├── orders/                 # Order management
├── wishlist/               # Wishlist management
├── reviews/                # Product reviews
└── categories/             # Category browsing

/admin/v1/                  # Admin panel routes
├── staff/                  # Admin management
├── products/               # Product management
├── order/                  # Order management
├── customers/              # Customer management
├── reviews/                # Review management
└── parameters/             # System parameters
    ├── categories/         # Category management
    ├── subcategories/      # Subcategory management
    ├── types/              # Type management
    ├── brands/             # Brand management
    ├── spec-lists/         # Specification management
    ├── hero-carousel/      # Carousel management
    ├── ads-panel/          # Advertisement management
    └── company-info/       # Company info management
```

### 2. Route Protection
```javascript
// Public routes (no authentication)
router.get('/products', productController.getAllProducts);
router.get('/categories', categoryController.getAllCategories);

// Customer protected routes (JWT required)
router.get('/cart', customerAuth, cartController.getCart);
router.post('/orders/checkout', customerAuth, orderController.checkout);

// Admin protected routes (session required)
router.get('/dashboard', authMiddleware, adminController.dashboard);
router.post('/products', authMiddleware, productController.createProduct);

// Role-based protected routes
router.delete('/admin/:id', authMiddleware, rbac('superadmin'), adminController.deleteAdmin);
```

---

## 🎨 Frontend Integration (EJS)

### 1. Template Structure
```
src/views/
├── partials/               # Reusable components
│   ├── header.ejs         # Navigation header
│   ├── footer.ejs         # Footer with scripts
│   ├── auth-header.ejs    # Authentication header
│   └── auth-footer.ejs    # Authentication footer
├── admin/                 # Admin panel templates
├── products/              # Product management templates
├── orders/                # Order management templates
├── customer/              # Customer management templates
├── reports/               # Analytics and reports
└── errors/                # Error pages
```

### 2. Template Data Flow
```javascript
// Controller passes data to template
res.render('products/list', {
  title: 'Products Management',
  products: productsData,
  pagination: paginationData,
  filters: filterData,
  user: req.session.admin
});
```

### 3. Responsive Design
- **Mobile-first approach** with responsive breakpoints
- **Dual layouts**: Desktop tables + Mobile cards
- **Touch-friendly** navigation and interactions
- **Progressive enhancement** for better UX

---

## 🔐 Security Implementation

### 1. Password Security
```javascript
// Password hashing with bcrypt
const hashedPassword = await bcrypt.hash(password, 10);

// Password verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### 2. JWT Security
```javascript
// Token generation with expiration
const token = jwt.sign(
  // ...


---

## 🧾 Recent Updates

### Export System Enhancement (January 2025)
- **Comprehensive Export Features**: Added multi-sheet Excel and structured CSV exports
- **Price Change Tracking**: 30-day price modification history with percentage calculations
- **Mixed Order Analytics**: Advanced order fulfillment analysis with revenue efficiency
- **Inventory Intelligence**: Enhanced stock movement tracking with product name resolution
- **Error Handling**: Robust fallbacks and graceful error handling for export operations

### Code Cleanup (January 2025)
- **Removed Redundant Files**: 
  - `src/controllers/downloadComprehensiveExcel.js` (functionality moved to dashboardController)
  - `src/controllers/reportController.js` (consolidated into dashboardController)
  - `src/services/dashboardService.js` (functionality distributed to specialized services)
- **Updated Routes**: Fixed salesRoutes.js to use dashboardController for all report endpoints
- **Documentation**: Added EXPORT_FEATURES.md for comprehensive export documentation

### Dashboard Improvements (August 2025)
- **Mixed Order Support**: Enhanced analytics for orders with mixed item statuses
- **Chart Data Fixes**: Proper numeric data formatting for Chart.js compatibility
- **Inventory Fallbacks**: Smart fallback mechanisms when inventory logs are empty
- **Sales Backfill**: Added script to populate Sale documents from existing orders

  { userId, email, tokenVersion },
  process.env.JWT_SECRET_KEY,
  { expiresIn: '5d' }
);

// Token invalidation via version increment
await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
```

### 3. Session Security
```javascript
// Secure session configuration
app.use(session({
  name: 'multitrade.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### 4. Input Validation
```javascript
// Express validator middleware
const { body, validationResult } = require('express-validator');

const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('phone').isMobilePhone(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

---

## 📊 Database Design Patterns

### 1. Referencing vs Embedding
```javascript
// Referenced relationships (normalized)
const orderSchema = {
  user: { type: ObjectId, ref: 'User' },
  shippingAddress: { type: ObjectId, ref: 'ShippingAddress' }
};

// Embedded documents (denormalized)
const productSchema = {
  images: [String],
  specifications: [{
    title: String,
    value: String
  }]
};
```

### 2. Indexing Strategy
```javascript
// Compound indexes for queries
userSchema.index({ email: 1, status: 1 });
productSchema.index({ category: 1, brand: 1, price: 1 });
orderSchema.index({ user: 1, createdAt: -1 });

// Text indexes for search
productSchema.index({ 
  title: 'text', 
  description: 'text' 
});
```

### 3. Aggregation Pipelines
```javascript
// Complex data aggregation
const salesData = await Order.aggregate([
  { $match: { status: 'delivered' } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    totalSales: { $sum: '$totalPrice' },
    orderCount: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

---

## 🚀 Performance Optimizations

### 1. Database Optimizations
- **Pagination** for large datasets
- **Selective field projection** to reduce data transfer
- **Aggregation pipelines** for complex queries
- **Connection pooling** with mongoose
- **Indexes** on frequently queried fields

### 2. Caching Strategies
- **Static file caching** with Express static middleware
- **Session storage** in MongoDB for scalability
- **Image optimization** and compression
- **CDN-ready** file structure

### 3. Code Optimizations
- **Async/await** for better error handling
- **Promise.all()** for parallel operations
- **Lean queries** for read-only operations
- **Middleware chaining** for reusable logic

---

## 🧪 Testing & Development

### 1. Development Scripts
```json
{
  "scripts": {
    "start": "node --no-deprecation --no-warnings app.js",
    "dev": "nodemon --exec \"node --no-deprecation --no-warnings\" app.js",
    "seed:dev": "node src/seed/devSeed.js",
    "seed:cleanDb": "node src/seed/cleanDatabase.js",
    "backfill:sales": "node src/seed/backfillSalesFromOrders.js"
  }
}
```

### 2. Environment Configuration
```bash
# .env file structure
PORT=9001
JWT_SECRET_KEY=your_jwt_secret
CONNECTION_STRING=mongodb+srv://user:pass@cluster.mongodb.net/multitrade
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
SESSION_SECRET=your_session_secret
NODE_ENV=development
DEVELOPER_EMAIL=dev@multitrade.com
DEVELOPER_PASSWORD=DevPass123
```

### 3. Database Seeding
```javascript
// Development data seeding
const seedDevelopmentData = async () => {
  await User.create(sampleUsers);
  await Product.create(sampleProducts);
  await Category.create(sampleCategories);
  console.log('Development data seeded successfully');
};
```

---

## 📈 Monitoring & Logging

### 1. Request Logging
```javascript
// Development request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.originalUrl}`);
  }
  next();
});
```

### 2. Error Handling
```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const statusCode = err.status || 500;
  
  res.status(statusCode).render('errors/generic', {
    title: `${statusCode} Error`,
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});
```

### 3. Health Checks
```javascript
// Server health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

---

## 🔄 Deployment Considerations

### 1. Production Configuration
- **Environment variables** for all secrets
- **HTTPS enforcement** in production
- **Secure headers** with Helmet
- **Rate limiting** for API endpoints
- **File upload limits** and validation

### 2. Database Considerations
- **Connection pooling** configuration
- **Replica sets** for high availability
- **Backup strategies** for data protection
- **Index optimization** for performance

### 3. Scalability Patterns
- **Stateless design** for horizontal scaling
- **Microservice-ready** architecture
- **Load balancer compatibility**
- **CDN integration** for static assets

---

## 📚 Code Standards & Best Practices

### 1. Naming Conventions
- **camelCase** for variables and functions
- **PascalCase** for models and classes
- **kebab-case** for file names and URLs
- **UPPER_CASE** for constants and environment variables

### 2. Error Handling Patterns
```javascript
// Consistent error responses
const handleError = (res, error, statusCode = 500) => {
  console.error(error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error'
  });
};
```

### 3. Code Organization
- **Single responsibility** principle for functions
- **Separation of concerns** between layers
- **DRY principle** with reusable utilities
- **Consistent file structure** across modules

---

*This documentation covers the complete codebase architecture and implementation details. For API usage, refer to API_DOCUMENTATION.md and ADMIN_API_DOCUMENTATION.md.*

*Last Updated: August 2025*