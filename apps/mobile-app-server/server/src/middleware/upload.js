/**
 * File Upload Middleware
 * Handles file uploads with validation and storage
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const logger = require('../config/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const profilePicturesDir = path.join(uploadsDir, 'profile-pictures');

[uploadsDir, profilePicturesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on upload type
    if (file.fieldname === 'profilePicture') {
      cb(null, profilePicturesDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter for image validation
const imageFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.fileValidationError = 'File too large. Maximum size is 5MB.';
      return res.status(400).json({ message: req.fileValidationError });
    }
    req.fileValidationError = err.message;
    return res.status(400).json({ message: req.fileValidationError });
  }
  if (err) {
    req.fileValidationError = err.message;
    return res.status(400).json({ message: req.fileValidationError });
  }
  next();
};

/**
 * Middleware for profile picture upload
 * Single file upload with field name 'profilePicture'
 */
const uploadProfilePicture = upload.single('profilePicture');

/**
 * Process and optimize uploaded image
 * Resizes and optimizes the image for web use
 */
const processImage = async (filePath, options = {}) => {
  const {
    width = 400,
    height = 400,
    quality = 80,
    format = 'jpeg',
  } = options;

  try {
    const processedPath = filePath.replace(path.extname(filePath), `-processed.${format}`);
    
    await sharp(filePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality })
      .toFile(processedPath);

    // Remove original file and rename processed file
    fs.unlinkSync(filePath);
    fs.renameSync(processedPath, filePath);

    logger.info('Image processed successfully', { filePath, width, height, quality });
    return filePath;
  } catch (error) {
    logger.error('Image processing failed', { filePath, error: error.message });
    throw error;
  }
};

/**
 * Delete file from filesystem
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('File deleted successfully', { filePath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('File deletion failed', { filePath, error: error.message });
    return false;
  }
};

/**
 * Get file URL (for serving files)
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // If it's already a URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // If it already starts with /uploads/, return as is
  if (filePath.startsWith('/uploads/')) {
    return filePath;
  }

  // Extract relative path from absolute path
  const relativePath = filePath.replace(path.join(__dirname, '../../'), '');
  // Remove leading slash if present to avoid double slashes
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  // Ensure it starts with /uploads/
  if (cleanPath.startsWith('/uploads/')) {
    return cleanPath;
  }
  return `/uploads/${cleanPath.replace(/^\//, '')}`;
};

module.exports = {
  upload,
  uploadProfilePicture,
  processImage,
  deleteFile,
  getFileUrl,
  handleMulterError,
};

