// Input sanitization utilities

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} input - The string to sanitize
 * @param {boolean} allowHTML - Whether to allow HTML tags (default: false)
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input, allowHTML = false) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Escape HTML entities
  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  if (allowHTML) {
    // Allow basic formatting tags only
    const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
    // This is a simplified version - for production, use a proper HTML sanitizer library
    // For now, we'll just escape everything
    return sanitized;
  }
  
  return sanitized;
}

/**
 * Sanitize an object recursively
 * @param {object} obj - The object to sanitize
 * @param {Array<string>} excludeFields - Fields to exclude from sanitization
 * @returns {object} - Sanitized object
 */
export function sanitizeObject(obj, excludeFields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, excludeFields));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (excludeFields.includes(key)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value instanceof Date) {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, excludeFields);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize request body
 * @param {object} body - Request body
 * @param {Array<string>} excludeFields - Fields to exclude (e.g., JSON fields)
 * @returns {object} - Sanitized body
 */
export function sanitizeRequestBody(body, excludeFields = ['major_news_events', 'symbols_analysis', 'account_pnls', 'tag_ids']) {
  return sanitizeObject(body, excludeFields);
}

