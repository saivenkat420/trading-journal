// Accounts routes
import express from "express";
import { query } from "../db.js";
import { AppError, validateRequired } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";
import { validateUUID } from "../middleware/validateParams.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { verifyOwnership } from "../utils/queryHelpers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const result = await query(
      "SELECT * FROM accounts WHERE user_id = $1 ORDER BY name ASC",
      [userId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const result = await query(
      "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Account not found", 404);
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  validate(schemas.account.create),
  async (req, res, next) => {
    try {
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { name, initial_balance = 0, current_balance } = sanitizedBody;
      const userId = req.userId;
      
      const result = await query(
        "INSERT INTO accounts (name, initial_balance, current_balance, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, initial_balance, current_balance || initial_balance, userId]
      );
      
      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  validateUUID("id"),
  validate(schemas.account.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { name, current_balance } = sanitizedBody;
      const userId = req.userId;
      
      // Verify ownership
      const owns = await verifyOwnership(query, "accounts", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Account not found", 404);
      }
      
      const updates = [];
      const params = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        params.push(name);
      }
      if (current_balance !== undefined) {
        updates.push(`current_balance = $${paramCount++}`);
        params.push(current_balance);
      }
      
      if (updates.length === 0) {
        throw new AppError("MISSING_FIELDS", "No fields to update");
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);
      
      const result = await query(
        `UPDATE accounts SET ${updates.join(", ")} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
        params
      );
      
      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Account not found", 404);
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Verify ownership
    const owns = await verifyOwnership(query, "accounts", id, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Account not found", 404);
    }
    
    // Check if account has any trades
    const tradesCheck = await query(
      "SELECT COUNT(*) FROM trade_accounts ta JOIN trades t ON ta.trade_id = t.id WHERE ta.account_id = $1 AND t.user_id = $2",
      [id, userId]
    );
    
    if (parseInt(tradesCheck.rows[0].count) > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete account with associated trades",
        409
      );
    }
    
    const result = await query(
      "DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Account not found", 404);
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

