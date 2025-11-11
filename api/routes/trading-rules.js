// Trading Rules routes
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

router.get("/", validate(schemas.query.tradingRules, "query"), async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const userId = req.userId;
    let sql = "SELECT * FROM trading_rules WHERE user_id = $1";
    const params = [userId];
    let paramCount = 2;

    if (is_active !== undefined) {
      sql += ` AND is_active = $${paramCount++}`;
      params.push(is_active === "true");
    }

    sql += " ORDER BY name ASC";

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(schemas.tradingRule.create), async (req, res, next) => {
  try {
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { name, description, rule_type, is_active = true } = sanitizedBody;
    const userId = req.userId;
    const result = await query(
      "INSERT INTO trading_rules (name, description, rule_type, is_active, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description || null, rule_type || null, is_active, userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  validateUUID("id"),
  validate(schemas.tradingRule.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { name, description, is_active } = sanitizedBody;
      const userId = req.userId;

      // Verify ownership
      const owns = await verifyOwnership(query, "trading_rules", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Trading rule not found", 404);
      }

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        params.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        params.push(is_active);
      }

      if (updates.length === 0) {
        throw new AppError("MISSING_FIELDS", "No fields to update");
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);

      const result = await query(
        `UPDATE trading_rules SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Trading rule not found", 404);
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
