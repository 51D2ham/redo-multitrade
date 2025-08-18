# 🛒 Ecommerce Admin Dashboard & API

A robust e-commerce backend and admin dashboard built with Node.js, Express, MongoDB, and EJS. This project enables product management, order processing, inventory tracking, analytics, and secure authentication for both customers and admins.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd ecommerce
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory. Example:
```
PORT=9001
JWT_SECRET_KEY=your_jwt_secret
CONNECTION_STRING=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ecom
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_gmail_app_password
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

### 3. Start the Server
```bash
npm start
```
Server runs at: `http://localhost:9001`

---

## 🗂️ Project Structure Overview

- **app.js**: Main Express app, sets up middleware, routes, error handling, and server start.
- **.env**: Environment variables (never share publicly).
- **src/**
  - **config/**: Database and mail configuration.
  - **controllers/**: Business logic for each route (admin, product, cart, order, report, etc.).
  - **middlewares/**: Auth, file upload, role access, etc.
  - **models/**: Mongoose schemas (User, Product, Order, etc.).
  - **public/**: Static assets (CSS, JS, uploads).
  - **routes/**: All API and admin routes.
    - **admin_tools.js**: Admin CRUD for products, categories, brands, etc.
    - **cartRoutes.js**: Cart API.
    - **orderRoutes.js**: Order/checkout API.
    - **salesRoutes.js**: Reporting endpoints.
    - **v1/**: Versioned API (admin & customer).
  - **seed/**: Seed scripts for initial data.
  - **services/**: Business logic (sales, etc.).
  - **utils/**: Helpers (email, stock, etc.).
  - **views/**: EJS templates (admin dashboard, product pages, etc.).

---

## 🔑 Authentication & Security

- **JWT-based authentication** for API endpoints (customers).
- **Session-based authentication** for admin dashboard.
- **Role-based access control** for admin features.
- **Password reset via OTP** (Gmail integration).
- **Helmet** for secure HTTP headers.

---

## 🌟 Features

### Admin Features
- Product, Category, Subcategory, Brand CRUD (`src/routes/admin_tools.js`)
- Inventory management and low-stock alerts
- Order management and history
- Analytics dashboard (`src/views/reports/comprehensiveDashboard.ejs`)
- Export reports to CSV/Excel
- Staff registration/login

### Customer Features
- Registration, login, password reset (`src/routes/v1/customer/api.js`)
- Cart management (add, update, remove, clear) (`src/routes/cartRoutes.js`)
- Checkout and order history (`src/routes/orderRoutes.js`)
- Profile management

### Public APIs
- Get all products: `GET /admin/tools/api/products`
- Get product by ID: `GET /admin/tools/api/products/:id`

---

## 📡 API Reference & Data Samples

### 1. Product Listing (Public API)

**List All Products**  
`GET /admin/tools/api/products`

**Response Example:**
```json
[
  {
    "productId": "682717364f338cd37695cfc1",
    "title": "Wireless Headphones",
    "brand": "Sony",
    "price": 999,
    "variants": [
      { "sku": "abc123", "color": "Black", "stock": 10 }
    ],
    "thumbnail": "/uploads/1747391445084-881178174.jpg"
  }
]
```

**Get Product by ID**  
`GET /admin/tools/api/products/:id`

**Response Example:**
```json
{
  "productId": "682717364f338cd37695cfc1",
  "title": "Wireless Headphones",
  "brand": "Sony",
  "description": "High quality wireless headphones with noise cancellation.",
  "price": 999,
  "variants": [
    { "sku": "abc123", "color": "Black", "stock": 10 }
  ],
  "images": [
    "/uploads/1747391445084-881178174.jpg",
    "/uploads/1747391445085-181456973.jpg"
  ]
}
```

---

### 2. Add to Cart

**Add Item to Cart**  
`POST /api/cart/`  
**Requires:** JWT

**Request Example:**
```json
{
  "productId": "682717364f338cd37695cfc1",
  "variantId": "RZR-WV3-012",
  "quantity": 2
}
```

**Response Example:**
```json
{
  "success": true,
  "cart": {
    "items": [
      {
        "itemId": "6655fe46fc13ae2c34b1d781",
        "productId": "682717364f338cd37695cfc1",
        "variantId": "RZR-WV3-012",
        "quantity": 2,
        "title": "Wireless Headphones",
        "price": 999
      }
    ],
    "total": 1998
  }
}
```

**Get Cart**  
`GET /api/cart/`  
**Requires:** JWT

**Response Example:**
```json
{
  "cart": {
    "items": [
      {
        "itemId": "6655fe46fc13ae2c34b1d781",
        "productId": "682717364f338cd37695cfc1",
        "variantId": "RZR-WV3-012",
        "quantity": 2,
        "title": "Wireless Headphones",
        "price": 999
      }
    ],
    "total": 1998
  }
}
```

**Update Item Quantity**  
`PUT /api/cart/items/:itemId`  
**Requires:** JWT

**Request Example:**
```json
{
  "quantity": 3
}
```

**Response Example:**
```json
{
  "success": true,
  "item": {
    "itemId": "6655fe46fc13ae2c34b1d781",
    "quantity": 3
  }
}
```

**Remove Item from Cart**  
`DELETE /api/cart/items/:itemId`  
**Requires:** JWT

**Response Example:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

**Clear All Items**  
`DELETE /api/cart/`  
**Requires:** JWT

**Response Example:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### 3. Checkout

**Checkout**  
`POST /api/orders/checkout`  
**Requires:** JWT

**Request Example (using new address):**
```json
{
  "useNewAddress": true,
  "shippingAddress": {
    "fullName": "siddham",
    "street": "gaurighat-10",
    "city": "Kathmandu",
    "state": "Bagmati",
    "postalCode": "44600",
    "phone": "+9779841123456"
  }
}
```

**Request Example (using saved address):**
```json
{
  "useNewAddress": false
}
```

- If `useNewAddress` is true, the provided address is used for this order.
- If `useNewAddress` is false, the user's saved/default address is used.
- If no saved address exists, the server will return an error.

**Response Example:**
```json
{
  "success": true,
  "orderId": "ORD123456789",
  "message": "Order placed successfully.",
  "order": {
    "orderId": "ORD123456789",
    "status": "Pending",
    "totalAmount": 1998,
    "shippingAddress": {
      "fullName": "siddham",
      "street": "gaurighat-10",
      "city": "Kathmandu",
      "state": "Bagmati",
      "postalCode": "44600",
      "phone": "+9779841123456"
    },
    "items": [
      { "productId": "682717364f338cd37695cfc1", "variantSku": "abc123", "quantity": 2, "price": 999 }
    ],
    "createdAt": "2025-07-12T12:34:56.789Z"
  }
}
```

---

### 4. Order History

**Get Order History**  
`GET /api/orders/order-history`  
**Requires:** JWT

**Response Example:**
```json
{
  "orders": [
    {
      "orderId": "ORD123456789",
      "status": "Delivered",
      "totalAmount": 1998,
      "createdAt": "2025-07-12T12:34:56.789Z",
      "items": [
        { "productId": "682717364f338cd37695cfc1", "variantSku": "abc123", "quantity": 2, "price": 999 }
      ]
    }
  ]
}
```

---

## 📝 Code & Folder Locations

- **Main App:** `app.js`
- **Routes:** `src/routes/`
- **Controllers:** `src/controllers/`
- **Models:** `src/models/`
- **Views (EJS):** `src/views/`
- **Middlewares:** `src/middlewares/`
- **Utils (Email, Stock):** `src/utils/`
- **Public Assets:** `src/public/`
- **Reports:** `src/controllers/reportController.js`, `src/routes/salesRoutes.js`, `src/views/reports/`

---

## 💡 Technologies Used

- Node.js, Express.js
- MongoDB (Mongoose)
- EJS (templating)
- Chart.js, Flatpickr (UI)
- connect-mongo, express-session
- Gmail API (nodemailer)
- Tailwind-inspired custom CSS

---

## 🛡️ Security

- Environment variables for secrets
- Helmet for HTTP headers
- Secure session cookies
- Password hashing and OTP for sensitive actions

---
## 🧑‍💻 Developer Seed Data

To quickly populate your database with dev users, use the developer seed script:
place the .env with 
      DEVELOPER_EMAIL=example@gmail.com
      DEVELOPER_PASSWORD=ABCDEFG@009

```bash
npm run seed:dev
```

This will execute `src/seed/devSeed.js` and insert mock data for local development and testing. You can customize the seed script as needed for your use case.
---


## 👤 Author & Maintainers

Made with ❤️ by 51D2ham
---

## 🧑‍💻 Onboarding Tips

- Always keep your `.env` file private.
- Run `npm install` after pulling new dependencies.
- Check `src/routes/` for all API endpoints and flows.
- Use the admin dashboard for all management tasks.
- For customizations, see controllers and EJS views.

---


----
wishlist apis 

http://localhost:9001/api/wishlist  //get 
http://localhost:9001/api/wishlist/items  //post     
{
  "productId": "6827160a4f338cd37695cf92",
  "variantSku": " AS-RZG14-011"
}

http://localhost:9001/api/wishlist/items/<item id>   // remove or delete single 

http://localhost:9001/api/wishlist // delete all 




npm run seed:cleanDb