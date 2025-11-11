// Trades routes
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

// All routes require authentication
router.use(authenticate);

// Get all trades
router.get(
  "/",
  validate(schemas.query.trades, "query"),
  async (req, res, next) => {
    try {
      const {
        status,
        symbol,
        date_from,
        date_to,
        limit = 100,
        offset = 0,
      } = req.query;
      const userId = req.userId;

      let sql = `
      SELECT 
        t.*,
        s.name as strategy_name,
        s.description as strategy_description,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', tg.id,
            'name', tg.name,
            'color', tg.color
          )) FILTER (WHERE tg.id IS NOT NULL),
          '[]'
        ) as tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'account_id', ta.account_id,
            'pnl', ta.pnl
          )) FILTER (WHERE ta.account_id IS NOT NULL),
          '[]'
        ) as accounts
      FROM trades t
      LEFT JOIN strategies s ON t.strategy_id = s.id
      LEFT JOIN trade_tags tt ON t.id = tt.trade_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      WHERE t.user_id = $1
    `;

      const params = [userId];
      let paramCount = 2;

      if (status) {
        sql += ` AND t.status = $${paramCount++}`;
        params.push(status);
      }

      if (symbol) {
        sql += ` AND t.symbol = $${paramCount++}`;
        params.push(symbol);
      }

      if (date_from) {
        sql += ` AND t.date >= $${paramCount++}`;
        params.push(date_from);
      }

      if (date_to) {
        sql += ` AND t.date <= $${paramCount++}`;
        params.push(date_to);
      }

      sql += ` GROUP BY t.id, s.id, s.name, s.description ORDER BY t.date DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(sql, params);

      // Get total count
      const countResult = await query(
        "SELECT COUNT(*) FROM trades WHERE user_id = $1",
        [userId]
      );

      res.json({
        data: result.rows,
        total: parseInt(countResult.rows[0].count),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get trade by ID
router.get("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await query(
      `
      SELECT 
        t.*,
        s.name as strategy_name,
        s.description as strategy_description,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', tg.id,
            'name', tg.name,
            'color', tg.color
          )) FILTER (WHERE tg.id IS NOT NULL),
          '[]'
        ) as tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'account_id', ta.account_id,
            'pnl', ta.pnl
          )) FILTER (WHERE ta.account_id IS NOT NULL),
          '[]'
        ) as accounts,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', tf.id,
            'file_name', tf.file_name,
            'file_path', tf.file_path,
            'file_type', tf.file_type,
            'file_size', tf.file_size,
            'uploaded_at', tf.uploaded_at
          )) FILTER (WHERE tf.id IS NOT NULL),
          '[]'
        ) as files
      FROM trades t
      LEFT JOIN strategies s ON t.strategy_id = s.id
      LEFT JOIN trade_tags tt ON t.id = tt.trade_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      LEFT JOIN trade_files tf ON t.id = tf.trade_id
      WHERE t.id = $1 AND t.user_id = $2
      GROUP BY t.id, s.id, s.name, s.description
    `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Trade not found", 404);
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create trade
router.post(
  "/",
  uploadLimiter,
  upload.array("files", 8),
  validate(schemas.trade.create),
  async (req, res, next) => {
    try {
      // Sanitize request body
      const sanitizedBody = sanitizeRequestBody(req.body);

      const {
        symbol,
        asset_class = "futures",
        trade_type,
        position_size,
        entry_price,
        exit_price,
        stop_loss,
        take_profit,
        date,
        strategy_id,
        notes,
        reflection,
        tag_ids = [],
        account_pnls = {},
        session,
        confidence_level,
        status = "closed",
        fees,
        contract_size,
        point_value,
        unit_size,
      } = sanitizedBody;
      const userId = req.userId;

      // Parse JSON fields if they're strings
      const parsedTagIds = Array.isArray(tag_ids)
        ? tag_ids
        : tag_ids
        ? JSON.parse(tag_ids)
        : [];
      const parsedAccountPnls =
        typeof account_pnls === "string"
          ? JSON.parse(account_pnls)
          : account_pnls;

      const trade = await transaction(async (client) => {
        // Verify strategy belongs to user if provided
        if (strategy_id) {
          const strategyCheck = await client.query(
            "SELECT user_id FROM strategies WHERE id = $1",
            [strategy_id]
          );
          if (
            strategyCheck.rows.length > 0 &&
            strategyCheck.rows[0].user_id !== userId
          ) {
            throw new AppError(
              "FORBIDDEN",
              "Strategy does not belong to user",
              403
            );
          }
        }

        // Verify accounts belong to user
        for (const accountId of Object.keys(parsedAccountPnls)) {
          const accountCheck = await client.query(
            "SELECT user_id FROM accounts WHERE id = $1",
            [accountId]
          );
          if (
            accountCheck.rows.length === 0 ||
            accountCheck.rows[0].user_id !== userId
          ) {
            throw new AppError(
              "FORBIDDEN",
              `Account ${accountId} does not belong to user`,
              403
            );
          }
        }

        // Verify tags belong to user
        for (const tagId of parsedTagIds) {
          const tagCheck = await client.query(
            "SELECT user_id FROM tags WHERE id = $1",
            [tagId]
          );
          if (
            tagCheck.rows.length === 0 ||
            tagCheck.rows[0].user_id !== userId
          ) {
            throw new AppError(
              "FORBIDDEN",
              `Tag ${tagId} does not belong to user`,
              403
            );
          }
        }

        // Insert trade
        const tradeResult = await client.query(
          `
        INSERT INTO trades (
          symbol, asset_class, trade_type, position_size, entry_price,
          exit_price, stop_loss, take_profit, date, strategy_id, notes, reflection,
          session, confidence_level, status, user_id, fees, contract_size, point_value, unit_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `,
          [
            symbol,
            asset_class,
            trade_type,
            position_size,
            entry_price || null,
            exit_price || null,
            stop_loss || null,
            take_profit || null,
            date,
            strategy_id || null,
            notes || null,
            reflection || null,
            session,
            confidence_level,
            status,
            userId,
            fees ? parseFloat(fees) : 0,
            contract_size ? parseFloat(contract_size) : null,
            point_value ? parseFloat(point_value) : null,
            unit_size ? parseFloat(unit_size) : null,
          ]
        );

        const newTrade = tradeResult.rows[0];

        // Insert tags
        if (parsedTagIds.length > 0) {
          for (const tagId of parsedTagIds) {
            await client.query(
              "INSERT INTO trade_tags (trade_id, tag_id) VALUES ($1, $2)",
              [newTrade.id, tagId]
            );
          }
        }

        // Insert account P&Ls and update account balances
        for (const [accountId, pnl] of Object.entries(parsedAccountPnls)) {
          const pnlValue = parseFloat(pnl);
          await client.query(
            "INSERT INTO trade_accounts (trade_id, account_id, pnl) VALUES ($1, $2, $3)",
            [newTrade.id, accountId, pnlValue]
          );

          // Update account balance
          await client.query(
            "UPDATE accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [pnlValue, accountId]
          );

          // Create transaction record
          await client.query(
            `INSERT INTO account_transactions (
            account_id, transaction_type, amount, description, trade_id, transaction_date
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              accountId,
              "trade_pnl",
              pnlValue,
              `Trade P&L for ${symbol}`,
              newTrade.id,
              date,
            ]
          );
        }

        // Handle file uploads - store directly in database as bytea
        if (req.files && req.files.length > 0) {
          const { generateFileName, getFileBuffer } = await import('../services/upload.js');
          
          for (const file of req.files) {
            const filePath = generateFileName(file.originalname, file.fieldname);
            const fileData = getFileBuffer(file);
            
            await client.query(
              `INSERT INTO trade_files (
              trade_id, file_name, file_path, file_size, file_type, file_data
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                newTrade.id,
                file.originalname,
                filePath,
                file.size,
                file.mimetype,
                fileData, // Store binary data directly in database
              ]
            );
          }
        }

        return newTrade;
      });

      res.status(201).json({ data: trade });
    } catch (error) {
      next(error);
    }
  }
);

// Update trade
router.put(
  "/:id",
  validateUUID("id"),
  uploadLimiter,
  upload.array("files", 8),
  validate(schemas.trade.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      // Sanitize request body
      const sanitizedBody = sanitizeRequestBody(req.body);
      const {
        symbol,
        entry_price,
        exit_price,
        session,
        confidence_level,
        notes,
        reflection,
        status,
        account_pnls,
        tag_ids,
        fees,
        contract_size,
        point_value,
        unit_size,
      } = sanitizedBody;
      const userId = req.userId;

      const trade = await transaction(async (client) => {
        // Get existing trade and verify ownership
        const existingTrade = await client.query(
          "SELECT * FROM trades WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
        if (existingTrade.rows.length === 0) {
          throw new AppError("NOT_FOUND", "Trade not found", 404);
        }

        const existing = existingTrade.rows[0];

        // Update trade fields
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (symbol !== undefined) {
          updates.push(`symbol = $${paramCount++}`);
          params.push(symbol);
        }

        if (entry_price !== undefined) {
          updates.push(`entry_price = $${paramCount++}`);
          params.push(entry_price);
        }

        if (exit_price !== undefined) {
          updates.push(`exit_price = $${paramCount++}`);
          params.push(exit_price);
        }

        if (session !== undefined) {
          updates.push(`session = $${paramCount++}`);
          params.push(session);
        }

        if (confidence_level !== undefined) {
          updates.push(`confidence_level = $${paramCount++}`);
          params.push(confidence_level);
        }

        if (notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          params.push(notes);
        }

        if (reflection !== undefined) {
          updates.push(`reflection = $${paramCount++}`);
          params.push(reflection);
        }

        if (fees !== undefined) {
          updates.push(`fees = $${paramCount++}`);
          params.push(fees ? parseFloat(fees) : 0);
        }

        if (contract_size !== undefined) {
          updates.push(`contract_size = $${paramCount++}`);
          params.push(contract_size ? parseFloat(contract_size) : null);
        }

        if (point_value !== undefined) {
          updates.push(`point_value = $${paramCount++}`);
          params.push(point_value ? parseFloat(point_value) : null);
        }

        if (unit_size !== undefined) {
          updates.push(`unit_size = $${paramCount++}`);
          params.push(unit_size ? parseFloat(unit_size) : null);
        }

        if (status !== undefined) {
          if (!["open", "closed", "reviewed"].includes(status)) {
            throw new AppError(
              "INVALID_VALUE",
              'status must be "open", "closed", or "reviewed"'
            );
          }
          updates.push(`status = $${paramCount++}`);
          params.push(status);
        }

        if (updates.length > 0) {
          updates.push(`updated_at = CURRENT_TIMESTAMP`);
          params.push(id, userId);

          await client.query(
            `UPDATE trades SET ${updates.join(
              ", "
            )} WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`,
            params
          );
        }

        // Update account P&Ls if provided
        if (account_pnls) {
          const parsedAccountPnls =
            typeof account_pnls === "string"
              ? JSON.parse(account_pnls)
              : account_pnls;

          // Verify accounts belong to user
          for (const accountId of Object.keys(parsedAccountPnls)) {
            const accountCheck = await client.query(
              "SELECT user_id FROM accounts WHERE id = $1",
              [accountId]
            );
            if (
              accountCheck.rows.length === 0 ||
              accountCheck.rows[0].user_id !== userId
            ) {
              throw new AppError(
                "FORBIDDEN",
                `Account ${accountId} does not belong to user`,
                403
              );
            }
          }

          // Get existing account P&Ls
          const existingPnls = await client.query(
            "SELECT account_id, pnl FROM trade_accounts WHERE trade_id = $1",
            [id]
          );

          // Revert old balance changes
          for (const existingPnl of existingPnls.rows) {
            const oldPnl = parseFloat(existingPnl.pnl);
            await client.query(
              "UPDATE accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
              [oldPnl, existingPnl.account_id]
            );
          }

          // Delete old account P&Ls
          await client.query("DELETE FROM trade_accounts WHERE trade_id = $1", [
            id,
          ]);

          // Insert new account P&Ls and update balances
          for (const [accountId, pnl] of Object.entries(parsedAccountPnls)) {
            const pnlValue = parseFloat(pnl);
            await client.query(
              "INSERT INTO trade_accounts (trade_id, account_id, pnl) VALUES ($1, $2, $3)",
              [id, accountId, pnlValue]
            );

            // Update account balance
            await client.query(
              "UPDATE accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
              [pnlValue, accountId]
            );
          }
        }

        // Update tags if provided
        if (tag_ids) {
          const parsedTagIds = Array.isArray(tag_ids)
            ? tag_ids
            : JSON.parse(tag_ids);

          // Verify tags belong to user
          for (const tagId of parsedTagIds) {
            const tagCheck = await client.query(
              "SELECT user_id FROM tags WHERE id = $1",
              [tagId]
            );
            if (
              tagCheck.rows.length === 0 ||
              tagCheck.rows[0].user_id !== userId
            ) {
              throw new AppError(
                "FORBIDDEN",
                `Tag ${tagId} does not belong to user`,
                403
              );
            }
          }

          // Delete existing tags
          await client.query("DELETE FROM trade_tags WHERE trade_id = $1", [
            id,
          ]);

          // Insert new tags
          if (parsedTagIds.length > 0) {
            for (const tagId of parsedTagIds) {
              await client.query(
                "INSERT INTO trade_tags (trade_id, tag_id) VALUES ($1, $2)",
                [id, tagId]
              );
            }
          }
        }

        // Handle new file uploads - store directly in database as bytea
        if (req.files && req.files.length > 0) {
          const { generateFileName, getFileBuffer } = await import('../services/upload.js');
          
          for (const file of req.files) {
            const filePath = generateFileName(file.originalname, file.fieldname);
            const fileData = getFileBuffer(file);
            
            await client.query(
              `INSERT INTO trade_files (
              trade_id, file_name, file_path, file_size, file_type, file_data
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [id, file.originalname, filePath, file.size, file.mimetype, fileData]
            );
          }
        }

        // Get updated trade
        const updatedTrade = await client.query(
          "SELECT * FROM trades WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
        return updatedTrade.rows[0];
      });

      res.json({ data: trade });
    } catch (error) {
      next(error);
    }
  }
);

// Delete trade
router.delete("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await transaction(async (client) => {
      // Verify ownership
      const owns = await verifyOwnership(query, "trades", id, userId);
      if (!owns) {
        throw new AppError("NOT_FOUND", "Trade not found", 404);
      }

      // Get account P&Ls before deleting
      const accountPnls = await client.query(
        "SELECT account_id, pnl FROM trade_accounts WHERE trade_id = $1",
        [id]
      );

      // Revert account balances
      for (const accountPnl of accountPnls.rows) {
        const pnl = parseFloat(accountPnl.pnl);
        await client.query(
          "UPDATE accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [pnl, accountPnl.account_id]
        );
      }

      // Delete trade (cascades to trade_accounts, trade_tags, trade_files)
      const result = await client.query(
        "DELETE FROM trades WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Trade not found", 404);
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
