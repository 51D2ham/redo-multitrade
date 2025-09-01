# 🔐 Customer Registration API with OTP Verification

## Overview
The customer registration system now includes email verification with OTP (One-Time Password) to ensure secure account creation. The registration process is split into multiple steps for better security and user experience.

## 🚀 Registration Flow

### Step 1: Send Registration OTP
**Endpoint:** `POST /api/v1/customers/send-registration-otp`

**Purpose:** Validates basic user information and sends OTP to email for verification.

**Request Body:**
```json
{
  "username": "john_doe123",
  "email": "john.doe@example.com",
  "phone": "9876543210"
}
```

**Validation Rules:**
- **Username:** 3-30 characters, alphanumeric + underscores only
- **Email:** Valid email format, automatically normalized
- **Phone:** Valid 10-digit Indian mobile number

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "email": "jo***@example.com"
}
```

**Error Responses:**
```json
// Validation Error (400)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Username must be between 3 and 30 characters",
    "Please provide a valid email address"
  ]
}

// Conflict Error (409)
{
  "success": false,
  "message": "Username already registered, Email already registered"
}

// Server Error (500)
{
  "success": false,
  "message": "Failed to send verification email. Please try again."
}
```

---

### Step 2: Check Registration Status (Optional)
**Endpoint:** `GET /api/v1/customers/registration-status`

**Purpose:** Check if there's an active registration session and OTP status.

**Success Response (200):**
```json
// Active session
{
  "success": true,
  "hasActiveSession": true,
  "isOTPExpired": false,
  "email": "jo***@example.com",
  "username": "john_doe123",
  "expiresAt": "2024-01-15T10:35:00.000Z"
}

// No active session
{
  "success": true,
  "hasActiveSession": false,
  "message": "No active registration session found."
}
```

---

### Step 3: Resend Registration OTP (Optional)
**Endpoint:** `POST /api/v1/customers/resend-registration-otp`

**Purpose:** Resend OTP if the previous one expired or wasn't received.

**Success Response (200):**
```json
{
  "success": true,
  "message": "New verification code sent to your email.",
  "email": "jo***@example.com"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "No active registration session found. Please start registration again."
}
```

---

### Step 4: Complete Registration
**Endpoint:** `POST /api/v1/customers/register`

**Purpose:** Verify OTP and complete user registration with full profile information.

**Content-Type:** `multipart/form-data` (for profile image upload)

**Request Body:**
```json
{
  "otp": "ABC123",
  "fullname": "John Doe",
  "password": "SecurePass123",
  "gender": "male",
  "dob": "1990-05-15",
  "permanentAddress": "123 Main Street, City, State",
  "tempAddress": "456 Temp Street, City, State",
  "profileImage": "[FILE]" // Optional file upload
}
```

**Validation Rules:**
- **OTP:** Exactly 6 alphanumeric characters
- **Full Name:** 2-50 characters, letters and spaces only
- **Password:** Minimum 8 characters with uppercase, lowercase, and number
- **Gender:** Must be 'male', 'female', or 'other'
- **Date of Birth:** Valid date, user must be 13-120 years old
- **Addresses:** Optional, maximum 200 characters each
- **Profile Image:** Optional, JPG/PNG/WEBP, max 5MB

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration completed successfully! Welcome to Multitrade!"
}
```

**Error Responses:**
```json
// Invalid/Expired OTP (400)
{
  "success": false,
  "message": "Invalid or expired verification code."
}

// Session Expired (400)
{
  "success": false,
  "message": "Registration session expired. Please start registration again."
}

// Validation Error (400)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    "You must be at least 13 years old to register"
  ]
}

// Conflict Error (409) - Race condition protection
{
  "success": false,
  "message": "Username already registered, Email already registered"
}
```

---

## 📧 Email Templates

### Registration OTP Email
- **Subject:** "📧 Verify Your Email Address"
- **Content:** Welcome message with 6-character OTP code
- **Expiry:** 5 minutes
- **Design:** Professional template with company branding

### Welcome Email
- **Subject:** "🎉 Welcome to Multitrade!"
- **Content:** Account creation confirmation and getting started guide
- **Sent:** After successful registration completion

---

## 🔒 Security Features

### OTP Security
- **Length:** 6 characters (alphanumeric)
- **Expiry:** 5 minutes from generation
- **Single Use:** OTP is cleared after successful verification
- **Rate Limiting:** Prevents spam OTP requests

### Session Management
- **Storage:** MongoDB-backed sessions
- **Expiry:** 24 hours for registration session
- **Cleanup:** Automatic cleanup after successful registration

### Input Validation
- **Server-side:** Comprehensive validation using express-validator
- **Sanitization:** Email normalization, input trimming
- **XSS Protection:** Input sanitization and validation

### Password Security
- **Hashing:** bcrypt with salt rounds
- **Requirements:** Minimum 8 characters, mixed case, numbers
- **Storage:** Only hashed passwords stored in database

---

## 🛠️ Implementation Details

### Database Changes
```javascript
// User Model Updates
{
  registrationOTP: { type: String },
  registrationOTPExpires: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  // ... existing fields
}
```

### Session Structure
```javascript
req.session.registrationData = {
  username: "john_doe123",
  email: "john.doe@example.com",
  phone: "9876543210",
  otp: "ABC123",
  otpExpires: Date
}
```

### Error Handling
- Comprehensive error messages
- File cleanup on errors (uploaded images)
- Graceful fallbacks for email failures
- Race condition protection

---

## 🧪 Testing the API

### Using cURL

**1. Send Registration OTP:**
```bash
curl -X POST http://localhost:9001/api/v1/customers/send-registration-otp \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "test@example.com",
    "phone": "9876543210"
  }'
```

**2. Check Registration Status:**
```bash
curl -X GET http://localhost:9001/api/v1/customers/registration-status \
  -H "Cookie: multitrade.sid=your_session_cookie"
```

**3. Complete Registration:**
```bash
curl -X POST http://localhost:9001/api/v1/customers/register \
  -H "Cookie: multitrade.sid=your_session_cookie" \
  -F "otp=ABC123" \
  -F "fullname=Test User" \
  -F "password=TestPass123" \
  -F "gender=male" \
  -F "dob=1990-01-01" \
  -F "permanentAddress=Test Address" \
  -F "profileImage=@/path/to/image.jpg"
```

---

## 🚨 Common Issues & Solutions

### Issue: OTP Not Received
**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Use resend OTP endpoint
4. Check server email configuration

### Issue: Session Expired
**Solutions:**
1. Start registration process again
2. Complete registration within session timeout
3. Check browser cookie settings

### Issue: Validation Errors
**Solutions:**
1. Review validation rules in documentation
2. Ensure all required fields are provided
3. Check data formats (email, phone, date)

### Issue: File Upload Errors
**Solutions:**
1. Check file size (max 5MB)
2. Verify file type (JPG, PNG, WEBP)
3. Ensure proper multipart/form-data encoding

---

## 📊 Monitoring & Analytics

### Success Metrics
- OTP delivery rate
- Registration completion rate
- Email verification success rate
- Time to complete registration

### Error Tracking
- Failed OTP deliveries
- Validation failures
- Session timeouts
- File upload errors

---

## 🔄 Migration Guide

### For Existing Frontend Applications
1. Update registration form to two-step process
2. Add OTP verification step
3. Handle new error responses
4. Update success messages
5. Add session status checking

### For Mobile Applications
1. Implement OTP input screen
2. Add resend OTP functionality
3. Handle session management
4. Update API endpoints
5. Test file upload functionality

---

## 📝 Changelog

### Version 2.0.0 (Current)
- ✅ Added OTP-based email verification
- ✅ Two-step registration process
- ✅ Comprehensive input validation
- ✅ Session-based OTP management
- ✅ Professional email templates
- ✅ Enhanced security features
- ✅ Race condition protection
- ✅ Improved error handling

### Version 1.0.0 (Previous)
- ❌ Direct registration without verification
- ❌ Basic validation only
- ❌ No email verification
- ❌ Security vulnerabilities

---

*Last Updated: January 2024*
*API Version: 2.0.0*