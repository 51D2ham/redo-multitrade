const fs = require('fs');
const path = require('path');

// Secure file deletion utility to prevent SSRF attacks
const secureDeleteFile = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  
  // Remove leading slash and normalize path
  let cleanPath = filename.replace(/^\/+/, '');
  
  // Ensure path starts with 'uploads/'
  if (!cleanPath.startsWith('uploads/')) {
    console.warn('Invalid path - must start with uploads/:', filename);
    return false;
  }
  
  // Remove 'uploads/' prefix to get relative path within uploads dir
  const relativePath = cleanPath.substring(8); // Remove 'uploads/'
  
  // Sanitize path - prevent traversal attacks
  if (relativePath.includes('..') || relativePath.includes('\\')) {
    console.warn('Path traversal attempt blocked:', filename);
    return false;
  }
  
  // Define allowed upload directory
  const uploadsDir = path.resolve(__dirname, '../../public/uploads');
  const filePath = path.join(uploadsDir, relativePath);
  
  // Ensure the resolved path is within the uploads directory
  if (!filePath.startsWith(uploadsDir)) {
    console.warn('Path traversal attempt blocked:', filename);
    return false;
  }
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('File deletion error:', error.message);
  }
  
  return false;
};

module.exports = { secureDeleteFile };