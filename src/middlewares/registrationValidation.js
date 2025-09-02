const { StatusCodes } = require('http-status-codes');

// Custom validation helpers
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isPhone = (phone) => /^[6-9]\d{9}$/.test(phone);
const isUsername = (username) => /^[a-zA-Z0-9_]{3,30}$/.test(username);
const isName = (name) => /^[a-zA-Z\s]{2,50}$/.test(name);
const isPassword = (password) => password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

// Validation for registration OTP
const validateRegistrationOTP = (req, res, next) => {
  const { username, email, phone } = req.body;
  const errors = [];
  
  if (!username || !isUsername(username)) {
    errors.push('Username must be 3-30 characters with letters, numbers, and underscores only');
  }
  
  if (!email || !isEmail(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!phone || !isPhone(phone)) {
    errors.push('Please provide a valid 10-digit Indian phone number');
  }
  
  if (errors.length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Normalize email
  req.body.email = email.toLowerCase().trim();
  req.body.username = username.trim();
  req.body.phone = phone.trim();
  
  next();
};

// Validation for complete registration
const validateRegistration = (req, res, next) => {
  const { otp, fullname, password, gender, dob, permanentAddress, tempAddress } = req.body;
  const errors = [];
  
  if (!otp || otp.length !== 6) {
    errors.push('OTP must be exactly 6 characters');
  }
  
  if (!fullname || !isName(fullname)) {
    errors.push('Full name must be 2-50 characters with letters and spaces only');
  }
  
  if (!password || !isPassword(password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    errors.push('Gender must be male, female, or other');
  }
  
  if (dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (isNaN(birthDate.getTime())) {
      errors.push('Please provide a valid date of birth');
    } else if (age < 13) {
      errors.push('You must be at least 13 years old to register');
    } else if (age > 120) {
      errors.push('Please provide a valid date of birth');
    }
  }
  
  if (permanentAddress && permanentAddress.length > 200) {
    errors.push('Permanent address must not exceed 200 characters');
  }
  
  if (tempAddress && tempAddress.length > 200) {
    errors.push('Temporary address must not exceed 200 characters');
  }
  
  if (errors.length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

// Legacy compatibility
const handleValidationErrors = (req, res, next) => next();

module.exports = {
  validateRegistrationOTP,
  validateRegistration,
  handleValidationErrors
};