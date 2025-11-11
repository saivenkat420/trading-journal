// File management routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validateUUID } from "../middleware/validateParams.js";
import { verifyOwnership } from "../utils/queryHelpers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get files for a trade
router.get("/trades/:tradeId", validateUUID("tradeId"), async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const userId = req.userId;

    // Verify trade ownership
    const owns = await verifyOwnership(query, "trades", tradeId, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Trade not found", 404);
    }

    const result = await query(
      "SELECT * FROM trade_files WHERE trade_id = $1 ORDER BY uploaded_at DESC",
      [tradeId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get files for an analysis
router.get("/analysis/:analysisId", validateUUID("analysisId"), async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    const userId = req.userId;

    // Verify analysis ownership
    const owns = await verifyOwnership(query, "analysis", analysisId, userId);
    if (!owns) {
      throw new AppError("NOT_FOUND", "Analysis not found", 404);
    }

    const result = await query(
      "SELECT * FROM analysis_files WHERE analysis_id = $1 ORDER BY uploaded_at DESC",
      [analysisId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Delete a trade file
router.delete("/trades/:fileId", validateUUID("fileId"), async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    // Get file info and verify trade ownership
    const fileResult = await query(
      `SELECT tf.*, t.user_id 
       FROM trade_files tf 
       JOIN trades t ON tf.trade_id = t.id 
       WHERE tf.id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      throw new AppError("NOT_FOUND", "File not found", 404);
    }

    const file = fileResult.rows[0];
    if (file.user_id !== userId) {
      throw new AppError("FORBIDDEN", "File does not belong to user", 403);
    }

    // Delete from database (file_data is automatically deleted with the row)
    await query("DELETE FROM trade_files WHERE id = $1", [fileId]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Delete an analysis file
router.delete("/analysis/:fileId", validateUUID("fileId"), async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    // Get file info and verify analysis ownership
    const fileResult = await query(
      `SELECT af.*, a.user_id 
       FROM analysis_files af 
       JOIN analysis a ON af.analysis_id = a.id 
       WHERE af.id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      throw new AppError("NOT_FOUND", "File not found", 404);
    }

    const file = fileResult.rows[0];
    if (file.user_id !== userId) {
      throw new AppError("FORBIDDEN", "File does not belong to user", 403);
    }

    // Delete from database (file_data is automatically deleted with the row)
    await query("DELETE FROM analysis_files WHERE id = $1", [fileId]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Serve a file - files are stored directly in Neon database as bytea
router.get("/serve/:filename", async (req, res, next) => {
  try {
    const { filename } = req.params;
    const userId = req.userId;
    
    // Validate filename (prevent path traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new AppError("INVALID_PARAMETER", "Invalid filename", 400);
    }
    
    // Get file from database - check both trade_files and analysis_files
    const tradeFileCheck = await query(
      `SELECT tf.id, tf.file_name, tf.file_data, tf.file_type, tf.file_size
       FROM trade_files tf 
       JOIN trades t ON tf.trade_id = t.id 
       WHERE (tf.file_path LIKE $1 OR tf.file_path = $1) AND t.user_id = $2 LIMIT 1`,
      [`%${filename}%`, userId]
    );
    
    const analysisFileCheck = await query(
      `SELECT af.id, af.file_name, af.file_data, af.file_type, af.file_size
       FROM analysis_files af 
       JOIN analysis a ON af.analysis_id = a.id 
       WHERE (af.file_path LIKE $1 OR af.file_path = $1) AND a.user_id = $2 LIMIT 1`,
      [`%${filename}%`, userId]
    );
    
    if (tradeFileCheck.rows.length === 0 && analysisFileCheck.rows.length === 0) {
      throw new AppError("FORBIDDEN", "File does not belong to user", 403);
    }

    const fileRecord = tradeFileCheck.rows[0] || analysisFileCheck.rows[0];
    
    if (!fileRecord.file_data) {
      throw new AppError("NOT_FOUND", "File data not found", 404);
    }

    // Set appropriate headers
    res.setHeader('Content-Type', fileRecord.file_type || 'application/octet-stream');
    res.setHeader('Content-Length', fileRecord.file_size);
    res.setHeader('Content-Disposition', `inline; filename="${fileRecord.file_name}"`);
    
    // Send file data directly from database
    res.send(fileRecord.file_data);
  } catch (error) {
    next(error);
  }
});

export default router;
