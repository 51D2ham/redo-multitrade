# Multitrade E-commerce Platform

A comprehensive e-commerce platform built with Node.js, Express, MongoDB, and EJS templating engine.

## Features

### 🛍️ Customer Features
- **User Registration & Authentication** with OTP-based email verification
- **Product Browsing** with advanced filtering and search
- **Shopping Cart** with variant support
- **Wishlist Management** 
- **Order Management** with status tracking
- **Product Reviews & Ratings**
- **Responsive Design** for all devices

### 👨‍💼 Admin Features
- **Dashboard** with comprehensive analytics
- **Product Management** with variant support
- **Bulk Product Upload** via CSV
- **Inventory Management** with low stock alerts
- **Order Management** with status updates
- **Content Management** (Hero carousel, Ads, Posters)
- **Parameter Management** (Categories, Brands, Types)
- **Customer Management**
- **Reports & Analytics** with export functionality

### 🔧 Technical Features
- **RESTful API** architecture
- **JWT Authentication** for customers
- **Session-based Authentication** for admins
- **File Upload** with image optimization
- **Email Notifications** for orders and registration
- **Real-time Inventory** tracking
- **SEO-friendly URLs** with slugs
- **Error Handling** and logging
- **CORS Support** for frontend integration

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Template Engine**: EJS
- **Authentication**: JWT, Express Sessions
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Custom middleware
- **Session Store**: MongoDB (connect-mongo)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd multitrade
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env` file in the root directory:
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

# Admin Seeding (Optional)
DEVELOPER_EMAIL=admin@multitrade.com
DEVELOPER_PASSWORD=SecureAdminPass123
DEVELOPER_PHONE=9800000000
DEVELOPER_NAME=System Administrator

# Debug (Optional)
DEBUG_REQUESTS=false
```

4. **Create Upload Directories**
```bash
mkdir -p public/uploads
mkdir -p src/uploads
```

5. **Seed Admin User (Optional)**
```bash
npm run seed:admin
```

6. **Start the Application**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Scripts

```json
{
  "start": "node app.js",
  "dev": "nodemon app.js",
  "seed:admin": "node src/seed/devSeed.js",
  "clean:db": "node src/seed/cleanDatabase.js"
}
```

## Project Structure

```
multitrade/
├── src/
│   ├── config/
│   │   ├── connectDb.js          # Database connection
│   │   └── mail.js               # Email configuration
│   ├── controllers/              # Route controllers
│   │   ├── adminRegister.js      # Admin authentication
│   │   ├── customerRegister.js   # Customer authentication
│   │   ├── productController.js  # Product management
│   │   ├── cartController.js     # Shopping cart
│   │   ├── wishlistController.js # Wishlist management
│   │   ├── orderController.js    # Order management
│   │   └── ...                   # Other controllers
│   ├── middlewares/              # Custom middleware
│   │   ├── auth.js               # Admin authentication
│   │   ├── customerAuth.js       # Customer authentication
│   │   ├── productPhoto.js       # File upload handling
│   │   └── ...                   # Other middleware
│   ├── models/                   # Database models
│   │   ├── productModel.js       # Product schema
│   │   ├── userRegisterModel.js  # Customer schema
│   │   ├── adminRegister.js      # Admin schema
│   │   ├── cartModel.js          # Cart schema
│   │   └── ...                   # Other models
│   ├── routes/                   # Route definitions
│   │   ├── v1/                   # API v1 routes
│   │   │   ├── customer/         # Customer routes
│   │   │   ├── products/         # Product routes
│   │   │   ├── cart/             # Cart routes
│   │   │   └── ...               # Other route groups
│   │   └── ...                   # Other routes
│   ├── services/                 # Business logic services
│   │   ├── notificationService.js # Email notifications
│   │   ├── inventoryService.js   # Inventory management
│   │   └── ...                   # Other services
│   ├── utils/                    # Utility functions
│   │   ├── generateOtp.js        # OTP generation
│   │   ├── stockManager.js       # Stock management
│   │   └── ...                   # Other utilities
│   ├── views/                    # EJS templates
│   │   ├── admin/                # Admin panel views
│   │   ├── products/             # Product management views
│   │   ├── orders/               # Order management views
│   │   └── ...                   # Other views
│   └── seed/                     # Database seeding
│       ├── devSeed.js            # Admin user seeding
│       └── cleanDatabase.js      # Database cleanup
├── public/
│   └── uploads/                  # Public upload directory
├── sample_data/                  # CSV templates and samples
│   ├── product_upload_template.csv
│   └── product_sample_data.csv
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── app.js                        # Main application file
├── index.js                      # Application entry point
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## API Documentation

Detailed API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Base URLs
- **API**: `http://localhost:9001/api/v1`
- **Admin Panel**: `http://localhost:9001/admin`
- **Dashboard**: `http://localhost:9001/admin/reports/comprehensive`

## Database Schema

### Core Models
- **User**: Customer accounts with authentication
- **Admin**: Administrator accounts
- **Product**: Products with variant support
- **Category/SubCategory/Type**: Product categorization
- **Brand**: Product brands
- **Cart**: Shopping cart items
- **Wishlist**: Customer wishlists
- **Order**: Customer orders with items
- **Review**: Product reviews and ratings

### Content Models
- **HeroCarousel**: Homepage carousel items
- **AdsPanel**: Advertisement panels
- **CompanyInfo**: Company information
- **ParameterPoster**: Category/Brand promotional images
- **BrandCarousel**: Brand showcase carousel

### System Models
- **InventoryLog**: Stock movement tracking
- **PriceLog**: Price change history
- **Sale**: Sales transaction records

## Authentication

### Customer Authentication
- **Registration**: OTP-based email verification
- **Login**: Email/password with JWT tokens
- **Token Validation**: Middleware for protected routes
- **Session Management**: Automatic token refresh

### Admin Authentication
- **Session-based**: MongoDB-backed sessions
- **Role-based Access**: Admin/SuperAdmin roles
- **Password Security**: Bcrypt hashing
- **Session Timeout**: 24-hour expiry

## File Upload

### Configuration
- **Storage**: Local filesystem
- **Path**: `/uploads/` directory
- **Formats**: JPG, JPEG, PNG, WEBP
- **Size Limit**: 5MB per file
- **Processing**: Automatic file naming with timestamps

### Usage
- **Product Images**: Multiple images per product
- **Category Icons**: Single icon per category
- **Brand Logos**: Single logo per brand
- **Content Images**: Hero carousel, ads, posters

## Email System

### Features
- **Registration OTP**: Email verification
- **Order Notifications**: Status updates
- **Admin Notifications**: New orders, low stock
- **Template System**: HTML email templates

### Configuration
- **Provider**: SMTP (Gmail, SendGrid, etc.)
- **Templates**: EJS-based email templates
- **Queue**: Async email sending
- **Error Handling**: Retry mechanism

## Deployment

### Production Setup

1. **Environment Variables**
```env
NODE_ENV=production
CONNECTION_STRING=mongodb://your-production-db
SESSION_SECRET=your-production-session-secret
JWT_SECRET=your-production-jwt-secret
```

2. **Process Management**
```bash
# Using PM2
npm install -g pm2
pm2 start app.js --name multitrade
pm2 startup
pm2 save
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /uploads/ {
        alias /path/to/multitrade/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 9001

CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- **Email**: support@multitrade.com
- **Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues**: GitHub Issues

## Changelog

### v1.0.0 (Current)
- Initial release with core e-commerce functionality
- Customer registration with OTP verification
- Product management with variants
- Shopping cart and wishlist
- Order management system
- Admin panel with analytics
- Bulk product upload
- Content management system
- Email notification system