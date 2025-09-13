# Multitrade E-commerce Platform

🚀 **Live Demo**: [https://redo-multitrade.onrender.com](https://redo-multitrade.onrender.com)

A comprehensive e-commerce platform built with Node.js, Express, MongoDB, and EJS templating engine featuring advanced product management, real-time inventory tracking, and comprehensive analytics.

## ✨ Key Features

### 🛍️ Customer Experience
- **OTP-based Registration** with email verification and rate limiting
- **Advanced Product Search** with filters, sorting, and pagination
- **Shopping Cart & Wishlist** with variant support and real-time updates
- **Order Tracking** with mixed status support and email notifications
- **Product Reviews & Ratings** with moderation system
- **Responsive Design** optimized for all devices
- **SEO-friendly URLs** with slug-based product access

### 👨💼 Admin Dashboard
- **Comprehensive Analytics** with visual reports and Excel export
- **Product Management** with bulk CSV upload and image handling
- **Inventory Management** with automated low-stock alerts and movement tracking
- **Order Processing** with flexible status management and email notifications
- **Content Management** (hero carousels, ads, banners, company info)
- **Customer Management** with detailed profiles and activity tracking
- **Real-time Reports** with filtering and export capabilities
- **Featured Products Ranking** with drag-and-drop interface

### 🔧 Technical Stack
- **Backend**: Node.js 16+, Express.js 4.19+
- **Database**: MongoDB 4.4+ with Mongoose ODM
- **Frontend**: EJS templating with Tailwind CSS
- **Authentication**: JWT (customers) + Express Sessions (admin)
- **Security**: Helmet.js, CSRF protection, Rate limiting, Input sanitization
- **File Upload**: Multer with validation and path traversal protection
- **Email**: Nodemailer with Gmail SMTP
- **Deployment**: Render.com with MongoDB Atlas

### 🔒 Security Features
- **CSRF Protection** on all admin forms
- **Rate Limiting** (3 OTP requests per hour per email)
- **Input Sanitization** against XSS and injection attacks
- **Path Traversal Protection** for file uploads
- **Secure Headers** with Helmet.js
- **JWT Token Validation** with version control for logout
- **Session Security** with MongoDB store and secure cookies
- **Password Requirements** (minimum 8 characters with bcrypt hashing)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Gmail account for email services

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/51D2ham/redo-multitrade.git
cd redo-multitrade
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
# Database Configuration
CONNECTION_STRING=mongodb://localhost:27017/multitrade_db
# For production: mongodb+srv://username:password@cluster.mongodb.net/multitrade_db

# Server Configuration
PORT=9001
NODE_ENV=development

# Security Keys
SESSION_SECRET=your-super-secret-session-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Email Configuration (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-specific-password

# Admin Seeding Configuration
DEVELOPER_EMAIL=admin@multitrade.com
DEVELOPER_PASSWORD=SecureAdminPass123
DEVELOPER_PHONE=9800000000
DEVELOPER_NAME=System Administrator

# Optional: Debug Settings
DEBUG_REQUESTS=false
```

4. **Create Admin User**
```bash
npm run seed:admin
```

5. **Start Development Server**
```bash
npm run dev
```

6. **Access the Application**
- **Admin Panel**: http://localhost:9001/admin/v1/staff/login
- **API Base**: http://localhost:9001/api/v1
- **Analytics Dashboard**: http://localhost:9001/admin/reports/comprehensive
- **API Documentation**: See API_DOCUMENTATION.md

## 📁 Project Structure

```
multitrade/
├── src/
│   ├── config/
│   │   ├── connectDb.js          # MongoDB connection
│   │   └── mail.js               # Email configuration
│   ├── controllers/              # Route controllers
│   │   ├── customerRegister.js   # Customer auth & profile
│   │   ├── productController.js  # Product management
│   │   ├── cartController.js     # Shopping cart logic
│   │   ├── orderController.js    # Order processing
│   │   └── ...                   # Other controllers
│   ├── middlewares/
│   │   ├── customerAuth.js       # JWT authentication
│   │   ├── auth.js               # Admin authentication
│   │   ├── security.js           # CSRF, rate limiting
│   │   └── ...                   # Other middlewares
│   ├── models/
│   │   ├── productModel.js       # Product, specs, reviews
│   │   ├── userRegisterModel.js  # Customer model
│   │   ├── orderModel.js         # Order management
│   │   └── ...                   # Other models
│   ├── routes/
│   │   ├── v1/                   # API routes (organized by feature)
│   │   │   ├── customer/         # Customer auth & profile
│   │   │   ├── products/         # Product APIs
│   │   │   ├── cart/             # Cart management
│   │   │   ├── orders/           # Order processing
│   │   │   └── ...               # Other API routes
│   │   ├── bulkUploadRoutes.js   # CSV bulk upload
│   │   ├── reportsRoutes.js      # Analytics & reports
│   │   └── ...                   # Other route files
│   ├── services/
│   │   ├── inventoryService.js   # Stock management
│   │   ├── notificationService.js # Email notifications
│   │   ├── orderManagementService.js # Order processing
│   │   └── ...                   # Other services
│   ├── utils/
│   │   ├── generateOtp.js        # OTP generation
│   │   ├── stockManager.js       # Inventory utilities
│   │   └── ...                   # Other utilities
│   ├── views/                    # EJS templates
│   │   ├── admin/                # Admin dashboard views
│   │   ├── products/             # Product management views
│   │   ├── orders/               # Order management views
│   │   ├── partials/             # Reusable components
│   │   └── ...                   # Other view directories
│   ├── uploads/                  # File uploads
│   │   └── products/             # Product images
│   └── seed/
│       ├── devSeed.js            # Admin user seeding
│       └── cleanDatabase.js      # Database cleanup
├── public/uploads/               # Public file access
├── sample_data/                  # CSV templates for bulk upload
├── .env                          # Environment variables
├── app.js                        # Main application file
├── package.json                  # Dependencies and scripts
├── nodemon.json                  # Development configuration
└── API_DOCUMENTATION.md          # Comprehensive API docs
```

## 📊 API Endpoints Overview

### Public APIs (No Authentication)
- `GET /api/v1/products` - Get products with advanced filtering
- `GET /api/v1/products/featured` - Get featured products
- `GET /api/v1/products/:id` - Get product details by ID/slug
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/brands` - Get all brands

### Customer APIs (JWT Required)
- `POST /api/v1/customers/register` - OTP-based registration
- `POST /api/v1/customers/login` - Customer authentication
- `GET /api/v1/cart` - Shopping cart management
- `POST /api/v1/orders` - Order creation and tracking
- `GET /api/v1/wishlist` - Wishlist management

### Admin APIs (Session Required)
- `GET /admin/v1/products` - Product management interface
- `GET /admin/v1/orders` - Order management dashboard
- `GET /admin/reports/comprehensive` - Analytics dashboard
- `POST /admin/v1/products/bulk-upload/upload` - CSV bulk upload

*For complete API documentation with examples, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)*

## 🛠️ Available Scripts

```bash
# Production
npm start                    # Start production server

# Development
npm run dev                  # Start with nodemon and debug flags

# Database Management
npm run seed:admin          # Create admin user from .env
npm run clean:db           # Clean database (use with caution)

# Maintenance
npm install                 # Install dependencies
npm audit fix              # Fix security vulnerabilities
```

## 🌐 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/multitrade_db
SESSION_SECRET=production-session-secret-min-32-chars
JWT_SECRET_KEY=production-jwt-secret-min-32-chars
GMAIL_USER=your-production-email@gmail.com
GMAIL_PASS=your-production-app-password
PORT=9001
```

### Render.com Deployment
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Configure build command: `npm install`
4. Configure start command: `npm start`
5. Deploy automatically on push to main branch

### MongoDB Atlas Setup
1. Create MongoDB Atlas cluster
2. Configure network access (0.0.0.0/0 for Render)
3. Create database user with read/write permissions
4. Use connection string in `CONNECTION_STRING` environment variable

## 📈 Performance Features

- **Lightweight API Responses** with selective field projection
- **Optimized Database Queries** with proper indexing and aggregation
- **Image Optimization** with automatic compression and resizing
- **Caching Headers** for static assets (7-day cache)
- **Pagination** for all list endpoints (configurable limits)
- **Real-time Inventory** tracking with automated stock alerts
- **Efficient Search** with MongoDB text indexes and regex optimization
- **Rate Limiting** to prevent API abuse and ensure fair usage

## 🔧 Development Guidelines

### Adding New Features
1. Create controller in `src/controllers/`
2. Add routes in appropriate `src/routes/v1/` directory
3. Create/update models in `src/models/`
4. Add views in `src/views/` if needed
5. Update API documentation

### Database Models Overview
- **Products**: Complex model with variants, specifications, and reviews
- **Orders**: Flexible order system with mixed status support
- **Users**: Separate customer and admin user management
- **Inventory**: Real-time stock tracking with movement logs
- **Content**: Dynamic content management (carousels, ads, banners)

### Code Style Guidelines
- Use async/await for asynchronous operations
- Implement proper error handling with try-catch blocks
- Validate all inputs and sanitize user data
- Use meaningful variable and function names
- Add comments for complex business logic
- Follow RESTful API conventions

## 🧪 Testing

### Manual API Testing
Use the provided examples in API_DOCUMENTATION.md or tools like:
- Postman collection (can be generated from documentation)
- curl commands (provided in documentation)
- Browser for GET endpoints

### Test Data
- Use `sample_data/` CSV files for bulk product upload testing
- Admin credentials from `.env` file for admin panel testing
- Create test customer accounts via registration API

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow coding guidelines and add proper documentation
4. Test your changes thoroughly
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request with detailed description

## 📞 Support & Resources

- **Live Demo**: [https://redo-multitrade.onrender.com](https://redo-multitrade.onrender.com)
- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Admin Panel**: [Admin Login](https://redo-multitrade.onrender.com/admin/v1/staff/login)
- **Analytics Dashboard**: [Reports](https://redo-multitrade.onrender.com/admin/reports/comprehensive)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern Node.js ecosystem
- Utilizes MongoDB for flexible data storage
- Implements industry-standard security practices
- Designed for scalability and maintainability

---

**Built with ❤️ by 51D2ham**

*Last updated: January 2025*