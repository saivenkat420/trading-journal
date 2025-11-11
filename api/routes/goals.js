// Goals routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";
import { validateUUID } from "../middleware/validateParams.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { verifyOwnership } from "../utils/queryHelpers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  validate(schemas.query.goals, "query"),
  async (req, res, next) => {
    try {
      const { month } = req.query;
      const userId = req.userId;
      let sql = "SELECT * FROM goals WHERE user_id = $1";
      const params = [userId];
      let paramCount = 2;

      if (month) {
        sql += ` AND month = $${paramCount++}`;
        params.push(month);
      }

      // account_id is deprecated/not supported in current schema

      sql += " ORDER BY month DESC";

      const result = await query(sql, params);
      res.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const result = await query(
      "SELECT * FROM goals WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Goal not found", 404);
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(schemas.goal.create), async (req, res, next) => {
  try {
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { month, profit_goal, win_rate_goal } = sanitizedBody;
    const userId = req.userId;

    // Use ON CONFLICT to update if exists
    const result = await query(
      `INSERT INTO goals (month, profit_goal, win_rate_goal, user_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id, month) 
       DO UPDATE SET profit_goal = EXCLUDED.profit_goal, win_rate_goal = EXCLUDED.win_rate_goal, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [month, profit_goal ?? null, win_rate_goal ?? null, userId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  validateUUID("id"),
  validate(schemas.goal.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { profit_goal, win_rate_goal } = sanitizedBody;
      const userId = req.userId;

      // Verify ownership
      const owns = await verifyOwnership(query, "goals", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Goal not found", 404);
      }

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (profit_goal !== undefined) {
        updates.push(`profit_goal = $${paramCount++}`);
        params.push(profit_goal);
      }
      if (win_rate_goal !== undefined) {
        updates.push(`win_rate_goal = $${paramCount++}`);
        params.push(win_rate_goal);
      }
      // account_id updates are deprecated/not supported

      if (updates.length === 0) {
        throw new AppError("MISSING_FIELDS", "No fields to update");
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);

      const result = await query(
        `UPDATE goals SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} AND user_id = $${
          paramCount + 1
        } RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Goal not found", 404);
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  validateUUID("id"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Verify ownership
      const owns = await verifyOwnership(query, "goals", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Goal not found", 404);
      }

      const result = await query(
        `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Goal not found", 404);
      }

      res.json({ data: { message: "Goal deleted successfully" } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
