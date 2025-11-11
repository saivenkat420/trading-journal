// Strategies routes
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

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const result = await query(
      "SELECT * FROM strategies WHERE user_id = $1 ORDER BY name ASC",
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
      "SELECT * FROM strategies WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Strategy not found", 404);
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(schemas.strategy.create), async (req, res, next) => {
  try {
    const sanitizedBody = sanitizeRequestBody(req.body, ["description"]);
    const { name, description } = sanitizedBody;
    const userId = req.userId;
    const result = await query(
      "INSERT INTO strategies (name, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [name, description || null, userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  validateUUID("id"),
  validate(schemas.strategy.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body, ["description"]);
      const { name, description } = sanitizedBody;
      const userId = req.userId;

      // Verify ownership
      const owns = await verifyOwnership(query, "strategies", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Strategy not found", 404);
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

      if (updates.length === 0) {
        throw new AppError("MISSING_FIELDS", "No fields to update");
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);

      const result = await query(
        `UPDATE strategies SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} AND user_id = $${
          paramCount + 1
        } RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Strategy not found", 404);
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
    const owns = await verifyOwnership(query, "strategies", id, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Strategy not found", 404);
    }

    // Check if strategy has any trades
    const tradesCheck = await query(
      "SELECT COUNT(*) FROM trades WHERE strategy_id = $1 AND user_id = $2",
      [id, userId]
    );

    if (parseInt(tradesCheck.rows[0].count) > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete strategy with associated trades",
        409
      );
    }

    const result = await query(
      "DELETE FROM strategies WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Strategy not found", 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
