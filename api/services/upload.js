// File upload utilities - Stores files directly in Neon Database (bytea)
import multer from 'multer';
import path from 'path';

// Try config/config.js first, fallback to config.js
let config;
try {
  config = (await import('../config/config.js')).default;
} catch (e) {
  config = (await import('../config.js')).default;
}

// Allowed file extensions
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv'];

// File filter with enhanced validation
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!config.storage.allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${config.storage.allowedTypes.join(', ')}`),
      false
    );
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Invalid file extension: ${ext}. Allowed extensions: ${allowedExtensions.join(', ')}`),
      false
    );
  }
  
  // Check filename for dangerous patterns
  const filename = file.originalname.toLowerCase();
  const dangerousPatterns = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*'];
  if (dangerousPatterns.some(pattern => filename.includes(pattern))) {
    return cb(new Error('Filename contains invalid characters'), false);
  }
  
  cb(null, true);
};

// Use memory storage - files will be stored in database as bytea
const storage = multer.memoryStorage();

// Multer configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.storage.maxFileSize
  },
  fileFilter: fileFilter
});

// Helper to generate unique filename (for reference in database)
export function generateFileName(originalName, fieldname) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  return `${fieldname}-${uniqueSuffix}${ext}`;
}

// Helper to get file buffer from multer file object
export function getFileBuffer(file) {
  return file.buffer;
}

// Note: Files are now stored directly in database as bytea
// No need for file paths, cloud storage, or local storage
