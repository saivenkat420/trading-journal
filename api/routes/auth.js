// Authentication routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { validate, schemas } from "../utils/validation.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { authenticate } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Register new user
router.post(
  "/register",
  apiLimiter,
  validate(schemas.auth.register),
  async (req, res, next) => {
    try {
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { email, password, username, first_name, last_name } = sanitizedBody;

      // Check if user already exists
      const existingUser = await query(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError("DUPLICATE_ENTRY", "Email already registered", 409);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const result = await query(
        `INSERT INTO users (email, password_hash, username, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, username, first_name, last_name, created_at`,
        [email.toLowerCase(), passwordHash, username || null, first_name || null, last_name || null]
      );

      const user = result.rows[0];

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      res.status(201).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login user
router.post(
  "/login",
  apiLimiter,
  validate(schemas.auth.login),
  async (req, res, next) => {
    try {
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { email, password } = sanitizedBody;

      // Find user by email
      const result = await query(
        "SELECT id, email, password_hash, username, first_name, last_name, is_active FROM users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new AppError("UNAUTHORIZED", "Invalid email or password", 401);
      }

      const user = result.rows[0];

      // Check if user is active
      if (!user.is_active) {
        throw new AppError("FORBIDDEN", "Account is deactivated", 403);
      }

      // Verify password
      const passwordMatch = await comparePassword(password, user.password_hash);

      if (!passwordMatch) {
        throw new AppError("UNAUTHORIZED", "Invalid email or password", 401);
      }

      // Update last login
      await query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
        [user.id]
      );

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      res.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;

    const result = await query(
      `SELECT id, email, username, first_name, last_name, is_active, 
       is_email_verified, last_login, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    const user = result.rows[0];

    res.json({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        is_email_verified: user.is_email_verified,
        last_login: user.last_login,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can track it)
router.post("/logout", authenticate, async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // We could implement token blacklisting here if needed
  res.json({ message: "Logged out successfully" });
});

export default router;

