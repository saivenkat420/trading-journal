// Settings routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validate setting key parameter
const validateSettingKey = (req, res, next) => {
  const { key } = req.params;
  if (!schemas.settings.validKeys.includes(key)) {
    return next(
      new AppError(
        "INVALID_PARAMETER",
        `Invalid setting key. Allowed keys: ${schemas.settings.validKeys.join(", ")}`,
        400
      )
    );
  }
  next();
};

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const result = await query(
      "SELECT key, value FROM settings WHERE user_id = $1",
      [userId]
    );
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
});

router.get("/:key", validateSettingKey, async (req, res, next) => {
  try {
    const { key } = req.params;
    const userId = req.userId;
    const result = await query(
      "SELECT value FROM settings WHERE key = $1 AND user_id = $2",
      [key, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Setting not found", 404);
    }
    res.json({ data: { key, value: result.rows[0].value } });
  } catch (error) {
    next(error);
  }
});

router.put("/:key", validateSettingKey, validate(schemas.settings.update), async (req, res, next) => {
  try {
    const { key } = req.params;
    const sanitizedBody = sanitizeRequestBody(req.body);
    const { value } = sanitizedBody;
    const userId = req.userId;

    const result = await query(
      `INSERT INTO settings (key, value, user_id) VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, userId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
