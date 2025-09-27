const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { validateFilePath } = require('./security');

const uploadDir = path.join(__dirname, '../../src/uploads');

// Create directory if not exists
fs.mkdir(uploadDir, { recursive: true }).catch(err => {
  console.error('Error creating upload directory:', err);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed MIME types (matches client-side validation)
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];
  
  // Allowed file extensions
  const allowedExtensions = /\.(jpeg|jpg|png|webp)$/i;
  
  const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
  const extname = allowedExtensions.test(file.originalname.toLowerCase());
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type: ${file.originalname}. Only JPEG, PNG, and WebP images are allowed.`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter
});

upload.deleteFile = async (filePath) => {
  const filename = path.basename(filePath);
  try {
    await fs.unlink(path.join(uploadDir, filename));
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Delete file error:', err);
    return false;
  }
};

module.exports = upload;