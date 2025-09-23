const fs = require('fs');
const path = require('path');

// Secure file deletion utility to prevent SSRF attacks
const secureDeleteFile = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  
  // Sanitize filename - remove any path traversal attempts
  const sanitizedFilename = path.basename(filename);
  
  // Define allowed upload directory
  const uploadsDir = path.resolve(__dirname, '../../public/uploads');
  const filePath = path.join(uploadsDir, sanitizedFilename);
  
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