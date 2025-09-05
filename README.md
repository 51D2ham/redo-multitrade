# Multitrade E-commerce Platform

🚀 **Live Demo**: [https://redo-multitrade.onrender.com](https://redo-multitrade.onrender.com)

A comprehensive e-commerce platform built with Node.js, Express, MongoDB, and EJS templating engine.

## ✨ Key Features

### 🛍️ Customer Experience
- **OTP-based Registration** with email verification
- **Advanced Product Search** with filters and sorting
- **Shopping Cart & Wishlist** with variant support
- **Order Tracking** with real-time status updates
- **Product Reviews & Ratings**
- **Responsive Design** for all devices

### 👨💼 Admin Dashboard
- **Comprehensive Analytics** with visual reports
- **Product Management** with bulk CSV upload
- **Inventory Management** with automated alerts
- **Order Processing** with status management
- **Content Management** (banners, ads, carousels)
- **Customer Management** with detailed profiles
- **Real-time Reports** with Excel export

### 🔧 Technical Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating with Tailwind CSS
- **Authentication**: JWT (customers) + Sessions (admin)
- **Security**: Helmet, CSRF protection, Rate limiting
- **File Upload**: Multer with validation
- **Email**: Nodemailer integration
- **Deployment**: Render.com

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

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
Create a `.env` file:
```env
# Database
CONNECTION_STRING=mongodb://localhost:27017/multitrade_db

# Server
PORT=9001
NODE_ENV=development

# Security
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-jwt-secret-key

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# Admin Seeding
DEVELOPER_EMAIL=admin@multitrade.com
DEVELOPER_PASSWORD=SecureAdminPass123
DEVELOPER_PHONE=9800000000
DEVELOPER_NAME=System Administrator
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
- **Dashboard**: http://localhost:9001/admin/reports/comprehensive

## 📁 Project Structure

```
multitrade/
├── src/
│   ├── config/           # Database & email configuration
│   ├── controllers/      # Route controllers
│   ├── middlewares/      # Authentication & security
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API & admin routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── views/           # EJS templates
│   └── uploads/         # File uploads
├── public/uploads/      # Public file access
├── sample_data/         # CSV templates
├── .env                 # Environment variables
├── app.js              # Main application
└── package.json        # Dependencies
```

## 🔐 Security Features

- **CSRF Protection** on all forms
- **Rate Limiting** to prevent abuse
- **Input Sanitization** against XSS/injection
- **Path Traversal Protection** for file uploads
- **Secure Headers** with Helmet.js
- **JWT Token Validation** for API access
- **Session Security** with MongoDB store

## 📊 API Endpoints

### Public APIs
- `GET /api/v1/products` - Get all products
- `GET /api/v1/categories` - Get categories
- `GET /api/v1/brands` - Get brands

### Customer APIs (JWT Required)
- `POST /api/v1/customers/register` - Register customer
- `POST /api/v1/customers/login` - Customer login
- `GET /api/v1/cart` - Get shopping cart
- `POST /api/v1/orders` - Create order

### Admin APIs (Session Required)
- `GET /admin/v1/products` - Manage products
- `GET /admin/v1/orders` - Manage orders
- `GET /admin/reports/comprehensive` - Analytics dashboard

## 🛠️ Available Scripts

```bash
npm start          # Production server
npm run dev        # Development with nodemon
npm run seed:admin # Create admin user
npm run clean:db   # Clean database
```

## 🌐 Deployment

### Render.com Deployment for (development only)
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NODE_ENV=production
CONNECTION_STRING=mongodb+srv://your-atlas-connection
SESSION_SECRET=production-session-secret
JWT_SECRET=production-jwt-secret
MAIL_HOST=smtp.gmail.com
MAIL_USER=your-production-email
MAIL_PASS=your-app-password
```

## 📈 Performance Features

- **Lightweight API Responses** (70% smaller payloads)
- **Optimized Database Queries** with proper indexing
- **Image Compression** for faster loading
- **Caching Headers** for static assets
- **Pagination** for large datasets
- **Real-time Inventory** tracking

## 🔧 Development

### Adding New Features
1. Create controller in `src/controllers/`
2. Add routes in `src/routes/`
3. Create models in `src/models/`
4. Add views in `src/views/`

### Database Models
- **Products**: With variants and specifications
- **Orders**: With mixed status support
- **Users**: Customers and admins
- **Inventory**: Real-time stock tracking
- **Content**: Banners, ads, carousels

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Live Demo**: [https://redo-multitrade.onrender.com](https://redo-multitrade.onrender.com)
- **Issues**: GitHub Issues
- **Documentation**: See API_DOCUMENTATION.md

---

**Built with ❤️ by 51D2ham**