// Tags routes
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
      "SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC",
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
      "SELECT * FROM tags WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Tag not found", 404);
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(schemas.tag.create), async (req, res, next) => {
  try {
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { name, color } = sanitizedBody;
    const userId = req.userId;
    const result = await query(
      "INSERT INTO tags (name, color, user_id) VALUES ($1, $2, $3) RETURNING *",
      [name, color || null, userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", validateUUID("id"), validate(schemas.tag.update), async (req, res, next) => {
  try {
    const { id } = req.params;
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { name, color } = sanitizedBody;
    const userId = req.userId;

    // Verify ownership
    const owns = await verifyOwnership(query, "tags", id, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Tag not found", 404);
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      params.push(color);
    }

    if (updates.length === 0) {
      throw new AppError("MISSING_FIELDS", "No fields to update");
    }

    params.push(id, userId);

    const result = await query(
      `UPDATE tags SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} AND user_id = $${
        paramCount + 1
      } RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Tag not found", 404);
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verify ownership
    const owns = await verifyOwnership(query, "tags", id, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Tag not found", 404);
    }

    const result = await query(
      "DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Tag not found", 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
