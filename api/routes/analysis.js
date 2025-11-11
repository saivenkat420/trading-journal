// Analysis routes
import express from "express";
import { query, transaction } from "../db.js";
import { AppError, validateRequired } from "../utils/errors.js";
import { upload } from "../services/upload.js";
import { authenticate } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { validate, schemas } from "../utils/validation.js";
import { validateUUID } from "../middleware/validateParams.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { verifyOwnership } from "../utils/queryHelpers.js";

const router = express.Router();

const parseArrayField = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // fall through to error below
    }
  }

  throw new AppError(
    "VALIDATION_ERROR",
    `${fieldName} must be provided as an array or a JSON encoded array.`,
    400,
    [
      {
        field: fieldName,
        message: `${fieldName} must be provided as an array or a JSON encoded array.`,
      },
    ]
  );
};

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  validate(schemas.query.analysis, "query"),
  async (req, res, next) => {
    try {
      const { timeframe, date_from, date_to } = req.query;
      const userId = req.userId;
      let sql = "SELECT * FROM analysis WHERE user_id = $1";
      const params = [userId];
      let paramCount = 2;

      if (timeframe) {
        sql += ` AND timeframe = $${paramCount++}`;
        params.push(timeframe);
      }
      if (date_from) {
        sql += ` AND start_date >= $${paramCount++}`;
        params.push(date_from);
      }
      if (date_to) {
        sql += ` AND end_date <= $${paramCount++}`;
        params.push(date_to);
      }

      sql += " ORDER BY start_date DESC";

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
      "SELECT * FROM analysis WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Analysis not found", 404);
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  uploadLimiter,
  upload.array("files", 20),
  validate(schemas.analysis.create),
  async (req, res, next) => {
    try {
      const sanitizedBody = sanitizeRequestBody(req.body);
      const {
        timeframe,
        custom_title,
        start_date,
        end_date,
        major_news_events,
        symbols_analysis,
        performance_context,
      } = sanitizedBody;
      const userId = req.userId;

      // Parse JSON fields if they're strings
      const parsedNewsEvents = parseArrayField(
        major_news_events,
        "major_news_events"
      );
      const parsedSymbolsAnalysis = parseArrayField(
        symbols_analysis,
        "symbols_analysis"
      );

      const analysis = await transaction(async (client) => {
        // Insert analysis
        const result = await client.query(
          "INSERT INTO analysis (timeframe, custom_title, start_date, end_date, major_news_events, symbols_analysis, performance_context, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [
            timeframe,
            custom_title || null,
            start_date,
            end_date,
            JSON.stringify(parsedNewsEvents),
            JSON.stringify(parsedSymbolsAnalysis),
            performance_context || null,
            userId,
          ]
        );

        const newAnalysis = result.rows[0];

        // Handle file uploads - store directly in database as bytea
        if (req.files && req.files.length > 0) {
          const { generateFileName, getFileBuffer } = await import('../services/upload.js');
          
          // If files are provided with symbol info in field name or body
          for (const file of req.files) {
            // Try to extract symbol from field name (e.g., "symbol_EURUSD_0")
            const symbolMatch = file.fieldname.match(/symbol_([^_]+)/);
            const symbol = symbolMatch ? symbolMatch[1] : null;

            const filePath = generateFileName(file.originalname, file.fieldname);
            const fileData = getFileBuffer(file);

            await client.query(
              `INSERT INTO analysis_files (
              analysis_id, symbol, file_name, file_path, file_size, file_type, file_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                newAnalysis.id,
                symbol,
                file.originalname,
                filePath,
                file.size,
                file.mimetype,
                fileData, // Store binary data directly in database
              ]
            );
          }
        }

        return newAnalysis;
      });

      res.status(201).json({ data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  validateUUID("id"),
  uploadLimiter,
  upload.array("files", 20),
  validate(schemas.analysis.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body);
      const {
        custom_title,
        major_news_events,
        symbols_analysis,
        performance_context,
      } = sanitizedBody;
      const userId = req.userId;

      const analysis = await transaction(async (client) => {
        // Check if analysis exists and verify ownership
        const existingResult = await client.query(
          "SELECT * FROM analysis WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
        if (existingResult.rows.length === 0) {
          throw new AppError("NOT_FOUND", "Analysis not found", 404);
        }

        // Update analysis fields
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (custom_title !== undefined) {
          updates.push(`custom_title = $${paramCount++}`);
          params.push(custom_title);
        }
        if (major_news_events !== undefined) {
          const parsed = parseArrayField(
            major_news_events,
            "major_news_events"
          );
          updates.push(`major_news_events = $${paramCount++}`);
          params.push(JSON.stringify(parsed));
        }
        if (symbols_analysis !== undefined) {
          const parsed = parseArrayField(symbols_analysis, "symbols_analysis");
          updates.push(`symbols_analysis = $${paramCount++}`);
          params.push(JSON.stringify(parsed));
        }
        if (performance_context !== undefined) {
          updates.push(`performance_context = $${paramCount++}`);
          params.push(performance_context);
        }

        if (updates.length > 0) {
          updates.push(`updated_at = CURRENT_TIMESTAMP`);
          params.push(id, userId);

          await client.query(
            `UPDATE analysis SET ${updates.join(
              ", "
            )} WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`,
            params
          );
        }

        // Handle new file uploads - store directly in database as bytea
        if (req.files && req.files.length > 0) {
          const { generateFileName, getFileBuffer } = await import('../services/upload.js');
          
          for (const file of req.files) {
            const symbolMatch = file.fieldname.match(/symbol_([^_]+)/);
            const symbol = symbolMatch ? symbolMatch[1] : null;

            const filePath = generateFileName(file.originalname, file.fieldname);
            const fileData = getFileBuffer(file);

            await client.query(
              `INSERT INTO analysis_files (
              analysis_id, symbol, file_name, file_path, file_size, file_type, file_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                id,
                symbol,
                file.originalname,
                filePath,
                file.size,
                file.mimetype,
                fileData,
              ]
            );
          }
        }

        // Get updated analysis
        const updatedResult = await client.query(
          "SELECT * FROM analysis WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
        return updatedResult.rows[0];
      });

      res.json({ data: analysis });
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
    const owns = await verifyOwnership(query, "analysis", id, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Analysis not found", 404);
    }

    // Delete from database (files will cascade)
    const result = await query(
      "DELETE FROM analysis WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Analysis not found", 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
