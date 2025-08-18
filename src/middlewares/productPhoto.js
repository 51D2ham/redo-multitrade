const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const uploadDir = path.join(__dirname, '../../public/uploads');

// Create directory if not exists
fs.mkdir(uploadDir, { recursive: true }).catch(err => {
  console.error('Error creating upload directory:', err);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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