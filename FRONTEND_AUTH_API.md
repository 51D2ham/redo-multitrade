# 🔐 Frontend Authentication API

## Overview
Complete authentication API for frontend applications with token verification, user management, and session handling.

---

## 🚀 Authentication Flow

### 1. **Registration**
**POST** `/api/v1/customers/register`
```javascript
// Send all user data
const response = await fetch('/api/v1/customers/register', {
  method: 'POST',
  body: formData // multipart/form-data with all fields
});
// Returns: OTP sent to email
```

### 2. **Verify OTP**
**POST** `/api/v1/customers/verify-otp`
```javascript
const response = await fetch('/api/v1/customers/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ otp: "ABC123" })
});
// Returns: Registration complete
```

### 3. **Login**
**POST** `/api/v1/customers/login`
```javascript
const response = await fetch('/api/v1/customers/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123"
  })
});

const data = await response.json();
// Store token: localStorage.setItem('token', data.accessToken);
```

**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🛡️ Token Verification

### **Verify Token & Get User Info**
**GET** `/api/v1/customers/verify-token`

**Headers:**
```javascript
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "fullname": "John Doe",
    "phone": "9876543210",
    "gender": "male",
    "dob": "1990-01-01T00:00:00.000Z",
    "profileImage": "/uploads/profile.jpg",
    "permanentAddress": "Address 1",
    "tempAddress": "Address 2",
    "isEmailVerified": true,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Invalid Token):**
```json
{
  "success": false,
  "message": "Token has been invalidated. Please login again."
}
```

---

## 👤 User Profile Management

### **Get Current User**
**GET** `/api/v1/customers/me`

**Headers:**
```javascript
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "fullname": "John Doe",
    // ... all user fields except sensitive data
  }
}
```

### **Update User Profile**
**PUT** `/api/v1/customers/users/:id`

**Headers:**
```javascript
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### **Change Password**
**PUT** `/api/v1/customers/change-password`

**Body:**
```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword"
}
```

---

## 🔄 Password Reset

### **Forgot Password**
**POST** `/api/v1/customers/forgot-password`
```json
{
  "email": "user@example.com"
}
```

### **Reset Password**
**POST** `/api/v1/customers/reset-password`
```json
{
  "email": "user@example.com",
  "otpCode": "ABC123",
  "newPassword": "newSecurePassword"
}
```

---

## 🚪 Logout

### **Logout User**
**POST** `/api/v1/customers/logout`

**Headers:**
```javascript
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully. Token invalidated."
}
```

---

## 💻 Frontend Implementation Examples

### **React/Vue/Angular Auth Service**

```javascript
class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = null;
  }

  // Set authorization header
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Login
  async login(email, password) {
    const response = await fetch('/api/v1/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.accessToken;
      localStorage.setItem('token', this.token);
      await this.getCurrentUser();
    }
    return data;
  }

  // Verify token and get user
  async verifyToken() {
    if (!this.token) return false;
    
    try {
      const response = await fetch('/api/v1/customers/verify-token', {
        headers: this.getAuthHeaders()
      });
      
      const data = await response.json();
      if (data.success) {
        this.user = data.user;
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // Get current user
  async getCurrentUser() {
    const response = await fetch('/api/v1/customers/me', {
      headers: this.getAuthHeaders()
    });
    
    const data = await response.json();
    if (data.success) {
      this.user = data.user;
    }
    return data;
  }

  // Logout
  async logout() {
    if (this.token) {
      try {
        await fetch('/api/v1/customers/logout', {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Registration with OTP
  async register(formData) {
    const response = await fetch('/api/v1/customers/register', {
      method: 'POST',
      body: formData
    });
    return await response.json();
  }

  async verifyOTP(otp) {
    const response = await fetch('/api/v1/customers/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    return await response.json();
  }
}

// Usage
const auth = new AuthService();
```

### **React Hook Example**

```javascript
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Verify token on app load
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/v1/customers/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/v1/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      setToken(data.accessToken);
      localStorage.setItem('token', data.accessToken);
      await verifyToken();
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### **Route Protection Example**

```javascript
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

// Usage in App
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
```

---

## 🔒 Security Features

### **Token Security**
- **JWT Tokens**: 5-day expiration
- **Token Versioning**: Invalidate all tokens on logout
- **Automatic Cleanup**: Expired tokens handled gracefully

### **API Security**
- **CORS Protection**: Configured origins
- **Input Validation**: Server-side validation
- **Rate Limiting**: Prevent abuse
- **Secure Headers**: Helmet.js protection

### **Error Handling**
- **Consistent Responses**: Standardized error format
- **Token Expiry**: Automatic redirect to login
- **Network Errors**: Graceful fallbacks

---

## 📱 Mobile App Integration

### **React Native Example**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileAuthService {
  async login(email, password) {
    const response = await fetch('/api/v1/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      await AsyncStorage.setItem('token', data.accessToken);
    }
    return data;
  }

  async verifyToken() {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;
    
    const response = await fetch('/api/v1/customers/verify-token', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.json();
  }

  async logout() {
    await AsyncStorage.removeItem('token');
  }
}
```

---

## 🧪 Testing Examples

### **Frontend Testing**

```javascript
// Test login
const loginData = await auth.login('test@example.com', 'password123');
console.log('Login:', loginData);

// Test token verification
const tokenValid = await auth.verifyToken();
console.log('Token valid:', tokenValid);

// Test user profile
const userProfile = await auth.getCurrentUser();
console.log('User:', userProfile);
```

---

*Complete authentication system ready for any frontend framework!* 🚀