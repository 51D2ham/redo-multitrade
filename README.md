# 🛒 Multitrade Backend - E-commerce Platform

A comprehensive e-commerce backend and admin dashboard built with Node.js, Express, MongoDB, and EJS. Features complete product management, order processing, inventory tracking, analytics, customer management, and secure authentication systems.

## 🌟 Key Features

### 🛍️ Customer Features
- **User Authentication**: JWT-based secure login/registration
- **Product Browsing**: Advanced filtering, search, and pagination
- **Shopping Cart**: Real-time cart management with persistence
- **Wishlist**: Save favorite products for later
- **Order Management**: Complete checkout process with order tracking
- **Reviews & Ratings**: Product review and rating system
- **Profile Management**: Update personal information and addresses

### 👨💼 Admin Features
- **Dashboard Analytics**: Comprehensive business insights and KPIs
- **Product Management**: CRUD operations with bulk upload support
- **Order Management**: Order processing, status updates, and tracking
- **Customer Management**: User accounts and profile management
- **Inventory Control**: Stock management with low-stock alerts
- **Content Management**: Hero carousel, ads panel, company information
- **Reports & Analytics**: Sales reports, revenue tracking, export capabilities
- **Role-Based Access**: Multi-level admin permissions

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repository-url>
cd multitrade_backend-master
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=9001
JWT_SECRET_KEY=your_jwt_secret_key_here
CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/multitrade
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_gmail_app_password
SESSION_SECRET=your_session_secret_here
NODE_ENV=development
DEVELOPER_EMAIL=admin@multitrade.com
DEVELOPER_PASSWORD=SecureAdminPass123
```

### 3. Database Setup
```bash
# Seed development data
npm run seed:dev

# Or clean database and start fresh
npm run seed:cleanDb
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

**Access Points:**
- **Admin Dashboard**: `http://localhost:9001/admin/reports/comprehensive`
- **Admin Login**: `http://localhost:9001/admin/v1/staff/login`
- **API Base**: `http://localhost:9001/api/v1/`

---

## 📁 Project Structure

```
multitrade_backend-master/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env                           # Environment variables
├── README.md                      # Project documentation
├── API_DOCUMENTATION.md           # Customer API documentation
├── ADMIN_API_DOCUMENTATION.md     # Admin API documentation
├── CODE_DOCUMENTATION.md          # Technical code documentation
├── POSTMAN_API_COLLECTION.json    # Postman API collection
├── sample_data/                   # CSV templates and samples
└── src/                          # Source code directory
    ├── config/                   # Database and email configuration
    ├── controllers/              # Business logic controllers
    ├── middlewares/              # Authentication and validation
    ├── models/                   # MongoDB/Mongoose schemas
    ├── routes/v1/                # Versioned API routes
    │   ├── customer/             # Customer authentication APIs
    │   ├── products/             # Product browsing APIs
    │   ├── cart/                 # Shopping cart APIs
    │   ├── orders/               # Order management APIs
    │   ├── wishlist/             # Wishlist APIs
    │   ├── admin/                # Admin panel routes
    │   └── parameters/           # System configuration
    ├── services/                 # Business logic services
    ├── utils/                    # Utility functions and helpers
    ├── views/                    # EJS templates for admin panel
    ├── uploads/                  # File upload storage
    └── seed/                     # Database seeding scripts
```

---

## 🔐 Authentication & Security

### Customer Authentication
- **JWT Tokens**: Secure API access with 5-day expiration
- **Token Versioning**: Invalidate all tokens on logout
- **Password Security**: bcrypt hashing with salt rounds
- **OTP System**: Email-based password reset with 5-minute expiry

### Admin Authentication
- **Session-based**: Secure admin panel access
- **Role-based Access Control**: Multi-level permissions (admin, superadmin, developer)
- **Session Storage**: MongoDB-backed sessions with 24-hour expiry

### Security Features
- **Helmet**: Security headers and XSS protection
- **CORS**: Configured for specific origins
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data validation
- **File Upload Security**: Type and size restrictions

---

## 🛠️ Technology Stack

### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **EJS** - Template engine for admin panel

### Authentication & Security
- **JWT** - Customer API authentication
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **express-session** - Admin session management
- **connect-mongo** - MongoDB session store

### File Handling & Communication
- **Multer** - File upload handling
- **Nodemailer** - Email service integration
- **CORS** - Cross-origin resource sharing

### Development Tools
- **Nodemon** - Development auto-restart
- **dotenv** - Environment variable management
- **Method-override** - HTTP method support

---

## 📚 Documentation

### Complete API Documentation
- **[Customer API Documentation](API_DOCUMENTATION.md)** - Complete customer-facing API reference
- **[Admin API Documentation](ADMIN_API_DOCUMENTATION.md)** - Admin panel and management APIs
- **[Code Documentation](CODE_DOCUMENTATION.md)** - Technical architecture and code structure
- **[Postman Collection](POSTMAN_API_COLLECTION.json)** - Complete API collection with authentication and all endpoints

### Quick API Reference

#### Customer APIs
```bash
# Authentication
POST /api/v1/customers/register    # User registration
POST /api/v1/customers/login       # User login
POST /api/v1/customers/logout      # User logout

# Shopping
GET  /api/v1/products/             # Browse products
POST /api/v1/cart/                 # Add to cart
POST /api/v1/orders/checkout       # Place order
GET  /api/v1/orders/order-history  # Order history

# Specification Search
GET  /api/v1/spec-lists/products   # Search by specification
GET  /api/v1/spec-lists/filter     # Advanced multi-spec filtering
GET  /api/v1/spec-lists/search     # Search by spec query
GET  /api/v1/spec-lists/filters    # Get filterable specifications

# Wishlist
GET  /api/v1/wishlist/             # Get wishlist
POST /api/v1/wishlist/items        # Add to wishlist
```

#### Admin Panel
```bash
# Access Points
GET  /admin/v1/staff/login         # Admin login page
GET  /admin/v1/staff/dashboard     # Main dashboard
GET  /admin/reports/comprehensive  # Analytics dashboard

# Management
GET  /admin/v1/products/           # Product management
GET  /admin/v1/order/              # Order management
GET  /admin/v1/customers/          # Customer management
```

---

## 🗄️ Database Models

### Core Models
- **User** - Customer accounts and authentication
- **Admin** - Admin accounts with role-based access
- **Product** - Product catalog with specifications
- **Category/SubCategory/Type** - Product categorization hierarchy
- **Brand** - Product brand management
- **Cart** - Shopping cart items
- **Order** - Order management and tracking
- **Review** - Product reviews and ratings
- **Wishlist** - Customer wishlist items

### Content Management
- **HeroCarousel** - Homepage carousel management
- **AdsPanel** - Advertisement management
- **CompanyInfo** - Company information and settings
- **SpecList** - Product specifications management

### System Models
- **InventoryLog** - Stock movement tracking
- **OrderStatus** - Order status history
- **ShippingAddress** - Customer shipping addresses

---

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-restart)
npm start               # Start production server

# Database Management
npm run seed:dev        # Seed development data
npm run seed:cleanDb    # Clean database
npm run seed:products   # Seed sample products
npm run seed:dashboard  # Seed dashboard data

# Testing
npm test               # Run tests (if configured)
```

---

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=9001
NODE_ENV=development

# Database
CONNECTION_STRING=mongodb+srv://user:pass@cluster.mongodb.net/multitrade

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# Email Service
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_gmail_app_password

# Admin Account
DEVELOPER_EMAIL=admin@multitrade.com
DEVELOPER_PASSWORD=SecureAdminPass123
```

### File Upload Configuration
- **Max File Size**: 5MB per file
- **Allowed Types**: JPG, PNG, WEBP
- **Storage**: Local filesystem (`src/uploads/`)
- **Security**: File type validation and size limits

---

## 📊 Features Overview

### 🛍️ E-commerce Core
- **Product Catalog**: Advanced filtering, search, and categorization
- **Shopping Cart**: Persistent cart with real-time updates
- **Order Management**: Complete order lifecycle with tracking
- **Payment Integration**: Ready for payment gateway integration
- **Inventory Management**: Real-time stock tracking and alerts

### 📱 Customer Experience
- **Responsive Design**: Mobile-first approach with touch-friendly UI
- **User Accounts**: Secure registration and profile management
- **Wishlist**: Save and manage favorite products
- **Reviews & Ratings**: Community-driven product feedback
- **Order Tracking**: Real-time order status updates

### 🎛️ Admin Dashboard
- **Analytics Dashboard**: Comprehensive business insights
- **Content Management**: Hero carousel, ads, company info
- **User Management**: Customer and admin account management
- **Reporting**: Sales reports with export capabilities
- **Role-Based Access**: Multi-level admin permissions

---

## 🚀 Getting Started Guide

### For Developers
1. **Clone the repository** and install dependencies
2. **Set up environment variables** in `.env` file
3. **Start MongoDB** and run database seeding
4. **Launch development server** with `npm run dev`
5. **Access admin panel** at `/admin/v1/staff/login`

### For Administrators
1. **Access admin dashboard** at `/admin/reports/comprehensive`
2. **Login with admin credentials** (see .env configuration)
3. **Manage products, orders, and customers** through the interface
4. **View analytics and reports** for business insights
5. **Configure content** like carousel and advertisements

### For API Integration
1. **Review API documentation** in `API_DOCUMENTATION.md`
2. **Import Postman collection** for testing
3. **Implement customer authentication** using JWT
4. **Integrate shopping cart and checkout** APIs
5. **Handle order management** and status updates

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

---

## 👨💻 Author

**Multitrade Development Team**
- Made with ❤️ by 51D2ham
- Email: dev@multitrade.com
- GitHub: [Project Repository]

---

## 🆘 Support

- **Documentation**: Check the comprehensive docs in this repository
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Email**: Contact dev@multitrade.com for technical support
- **Admin Support**: Use the admin panel help section

---

*Last Updated: January 2025*
*Version: 1.0.0*