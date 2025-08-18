# Review System Testing Guide

## System Overview
The review system has been completely fixed and optimized with the following components:

### 1. Database Schema (productModel.js)
- **Review Model**: Proper validation, indexes, and constraints
- **Unique Constraint**: One review per user per product
- **Status System**: pending → approved/rejected workflow
- **Rating Validation**: 1-5 stars only
- **Text Validation**: 10-1000 characters

### 2. Authentication (customerAuth.js)
- **JWT Validation**: Proper token verification
- **User Context**: Sets req.userInfo.userId correctly
- **Token Expiry**: Handles expired tokens gracefully

### 3. API Routes (src/routes/v1/reviews/api.js)
```javascript
// Public routes
GET /api/v1/reviews/products/:productId - Get product reviews

// Protected routes (require JWT)
POST /api/v1/reviews - Add review
GET /api/v1/reviews/my-reviews - Get user's reviews  
GET /api/v1/reviews/:reviewId - Get single review
PUT /api/v1/reviews/:reviewId - Update review
DELETE /api/v1/reviews/:reviewId - Delete review
GET /api/v1/reviews/can-review/:productId - Check if user can review
```

### 4. Controller Logic (reviewController.js)
- **Input Validation**: Comprehensive validation for all fields
- **Authorization**: User can only modify their own reviews
- **Product Rating Updates**: Automatic calculation based on approved reviews
- **Status Management**: Reviews require admin approval
- **Error Handling**: Proper error responses and logging

## Testing Steps

### Step 1: Authentication Test
```bash
# Register/Login to get JWT token
POST http://localhost:9001/api/v1/customers/register
POST http://localhost:9001/api/v1/customers/login
```

### Step 2: Add Review Test
```bash
POST http://localhost:9001/api/v1/reviews
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "productId": "VALID_PRODUCT_ID",
  "rating": 5,
  "review": "This is an excellent product with great quality and performance."
}
```

### Step 3: Get User Reviews
```bash
GET http://localhost:9001/api/v1/reviews/my-reviews
Authorization: Bearer YOUR_JWT_TOKEN
```

### Step 4: Update Review
```bash
PUT http://localhost:9001/api/v1/reviews/REVIEW_ID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "rating": 4,
  "review": "Updated review after more usage. Still good but not perfect."
}
```

### Step 5: Get Single Review
```bash
GET http://localhost:9001/api/v1/reviews/REVIEW_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### Step 6: Delete Review
```bash
DELETE http://localhost:9001/api/v1/reviews/REVIEW_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### Step 7: Get Product Reviews (Public)
```bash
GET http://localhost:9001/api/v1/reviews/products/PRODUCT_ID?page=1&limit=10
```

### Step 8: Check Can Review
```bash
GET http://localhost:9001/api/v1/reviews/can-review/PRODUCT_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

## Error Cases to Test

### 1. Invalid Data
```bash
# Missing required fields
POST http://localhost:9001/api/v1/reviews
{
  "productId": "123"
  // Missing rating and review
}

# Invalid rating
{
  "productId": "VALID_ID",
  "rating": 6,  // Should be 1-5
  "review": "Test review"
}

# Review too short
{
  "productId": "VALID_ID", 
  "rating": 5,
  "review": "Short"  // Should be at least 10 characters
}
```

### 2. Authorization Errors
```bash
# No token
POST http://localhost:9001/api/v1/reviews
{
  "productId": "VALID_ID",
  "rating": 5,
  "review": "This should fail without token"
}

# Invalid token
Authorization: Bearer invalid_token

# Expired token
Authorization: Bearer expired_token
```

### 3. Duplicate Review
```bash
# Try to add second review for same product
POST http://localhost:9001/api/v1/reviews
{
  "productId": "SAME_PRODUCT_ID",  // Same product as before
  "rating": 4,
  "review": "Trying to add another review"
}
```

### 4. Unauthorized Access
```bash
# Try to update someone else's review
PUT http://localhost:9001/api/v1/reviews/SOMEONE_ELSES_REVIEW_ID
{
  "rating": 1,
  "review": "Trying to update someone else's review"
}
```

## Admin Testing

### Admin Review Management
```bash
# Get all reviews (admin only)
GET http://localhost:9001/admin/v1/reviews

# Approve review
POST http://localhost:9001/admin/v1/reviews/REVIEW_ID/approve

# Reject review  
POST http://localhost:9001/admin/v1/reviews/REVIEW_ID/reject

# Delete review
DELETE http://localhost:9001/admin/v1/reviews/REVIEW_ID
```

## Expected Behaviors

### 1. Review Lifecycle
1. User adds review → Status: "pending"
2. Admin approves → Status: "approved" → Appears in public API
3. Admin rejects → Status: "rejected" → Hidden from public API
4. User updates review → Status resets to "pending"

### 2. Product Rating Updates
- Only approved reviews count toward product rating
- Rating is calculated as average of all approved reviews
- Review count shows only approved reviews
- Updates happen automatically when reviews are approved/rejected/deleted

### 3. Authorization Rules
- Users can only view/edit/delete their own reviews
- Public API only shows approved reviews
- Admin can manage all reviews

### 4. Validation Rules
- Rating: 1-5 stars (required)
- Review text: 10-1000 characters (required)
- One review per user per product
- Valid product ID required
- Valid JWT token required for protected routes

## Common Issues Fixed

1. **"Review not found or you are not authorized"**
   - Fixed: Proper user ID extraction from JWT
   - Fixed: Correct parameter names in routes

2. **Product rating not updating**
   - Fixed: Only count approved reviews
   - Fixed: Automatic updates on status changes

3. **Duplicate reviews allowed**
   - Fixed: Unique constraint on product + user combination

4. **Invalid data accepted**
   - Fixed: Comprehensive validation on all fields

5. **Status management issues**
   - Fixed: Proper workflow with pending → approved/rejected
   - Fixed: Reset to pending on updates

## Performance Optimizations

1. **Database Indexes**
   - product + user (unique)
   - product (for product reviews)
   - user (for user reviews)
   - status (for filtering)
   - createdAt (for sorting)

2. **Aggregation Pipelines**
   - Efficient rating calculations
   - Rating distribution statistics
   - Pagination support

3. **Caching Considerations**
   - Product ratings cached in product document
   - Review counts cached in product document
   - Automatic cache invalidation on review changes

The review system is now fully functional, secure, and optimized for production use.