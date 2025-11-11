// Error handling utilities
import logger, { logError } from "../middleware/logger.js";

export class AppError extends Error {
  constructor(code, message, statusCode = 400, data = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "AppError";
    this.data = data;
  }
}

// User-friendly error messages
const errorMessages = {
  'UNAUTHORIZED': 'You are not authorized to access this resource. Please log in.',
  'NOT_FOUND': 'The requested resource was not found.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'VALIDATION_ERROR': 'The provided data is invalid. Please check your input.',
  'INVALID_PARAMETER': 'Invalid parameter provided. Please check your request.',
  'MISSING_FIELDS': 'Required fields are missing. Please provide all required information.',
  'DUPLICATE_ENTRY': 'A record with this value already exists.',
  'FOREIGN_KEY_VIOLATION': 'Referenced record does not exist.',
  'CONFLICT': 'This operation conflicts with existing data.',
  'INVALID_VALUE': 'An invalid value was provided.',
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later.',
};

export function errorHandler(err, req, res, next) {
  // Log the error
  logError(err, req);

  if (err instanceof AppError) {
    // Use user-friendly message if available, otherwise use the error message
    const userMessage = errorMessages[err.code] || err.message;
    
    const response = {
      error: {
        code: err.code,
        message: userMessage,
        details: err.message !== userMessage ? err.message : undefined,
      },
    };
    
    // Include validation errors if present
    if (err.data) {
      response.error.errors = err.data;
    }
    
    return res.status(err.statusCode).json(response);
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: errorMessages['DUPLICATE_ENTRY']
      }
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: errorMessages['FOREIGN_KEY_VIOLATION']
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: errorMessages['UNAUTHORIZED']
      }
    });
  }

  // Default error - don't expose internal details in production
  const message = process.env.NODE_ENV === 'production' 
    ? errorMessages['INTERNAL_ERROR']
    : err.message || errorMessages['INTERNAL_ERROR'];
    
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: message
    }
  });
}

export function validateRequired(fields, data) {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new AppError('MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`);
  }
}

