// User management routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { hashPassword } from "../utils/password.js";
import { validateUUID } from "../middleware/validateParams.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get current user profile
router.get("/me", async (req, res, next) => {
  try {
    const userId = req.userId;

    const result = await query(
      `SELECT id, email, username, first_name, last_name, is_active, 
       is_email_verified, last_login, created_at, updated_at
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
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put("/me", validate(schemas.users.update), async (req, res, next) => {
  try {
    const userId = req.userId;
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { username, first_name, last_name } = sanitizedBody;

    const result = await query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, username, first_name, last_name, updated_at`,
      [username || null, first_name || null, last_name || null, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    res.json({
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put("/me/password", validate(schemas.users.changePassword), async (req, res, next) => {
  try {
    const userId = req.userId;
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { current_password, new_password } = sanitizedBody;

    // Get current user with password hash
    const userResult = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    // Verify current password
    const { comparePassword } = await import("../utils/password.js");
    const passwordMatch = await comparePassword(
      current_password,
      userResult.rows[0].password_hash
    );

    if (!passwordMatch) {
      throw new AppError("UNAUTHORIZED", "Current password is incorrect", 401);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    res.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin only - for now, users can only see themselves)
router.get("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Users can only view their own profile
    if (id !== userId) {
      throw new AppError("FORBIDDEN", "You can only view your own profile", 403);
    }

    const result = await query(
      `SELECT id, email, username, first_name, last_name, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    res.json({
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

