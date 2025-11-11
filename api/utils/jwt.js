// JWT token utilities
import jwt from 'jsonwebtoken';

// Try config/config.js first, fallback to config.js
let config;
try {
  config = (await import("../config/config.js")).default;
} catch (e) {
  try {
    config = (await import("../config.js")).default;
  } catch (e2) {
    config = {};
  }
}

const JWT_SECRET = process.env.JWT_SECRET || config.auth?.jwtSecret || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || config.auth?.jwtExpiresIn || '7d';

/**
 * Generate a JWT token for a user
 * @param {object} user - User object with id and email
 * @returns {string} - JWT token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

