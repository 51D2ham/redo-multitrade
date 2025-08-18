// Simple cart API test
const axios = require('axios');

const BASE_URL = 'http://localhost:9001';

// Test cart endpoints
async function testCartAPI() {
  try {
    console.log('Testing Cart API...\n');

    // Test 1: Check if cart API is accessible
    console.log('1. Testing cart API accessibility...');
    const testResponse = await axios.get(`${BASE_URL}/api/cart/test`);
    console.log('✅ Cart API is accessible:', testResponse.data);

    // Test 2: Try to get cart without auth (should fail)
    console.log('\n2. Testing cart access without auth (should fail)...');
    try {
      await axios.get(`${BASE_URL}/api/cart/`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Properly rejected unauthorized request');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n✅ Basic cart API tests completed!');
    console.log('\nTo test full functionality:');
    console.log('1. Get a JWT token by logging in a customer');
    console.log('2. Use the token in Authorization header: "Bearer <token>"');
    console.log('3. Test endpoints:');
    console.log('   - GET /api/cart/ (get cart)');
    console.log('   - POST /api/cart/ (add item)');
    console.log('   - PUT /api/cart/items/:itemId (update quantity)');
    console.log('   - DELETE /api/cart/items/:itemId (remove item)');
    console.log('   - DELETE /api/cart/ (clear cart)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testCartAPI();