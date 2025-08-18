const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const bulkUploadController = require('../controllers/bulkUploadController');
const requireAuth = require('../middlewares/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'bulk-upload-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Bulk upload page
router.get('/', bulkUploadController.showBulkUpload);

// Download template
router.get('/template', bulkUploadController.downloadTemplate);

// Download sample data
router.get('/sample', bulkUploadController.downloadSample);

// Process bulk upload with error handling
router.post('/', (req, res, next) => {
  upload.single('csvFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, bulkUploadController.processBulkUpload);

module.exports = router;