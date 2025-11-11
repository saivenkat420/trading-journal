// Account Transactions routes
import express from "express";
import { query, transaction as dbTransaction } from "../db.js";
import { AppError, validateRequired } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";
import { validateUUID } from "../middleware/validateParams.js";
import { sanitizeRequestBody } from "../utils/sanitize.js";
import { verifyOwnership } from "../utils/queryHelpers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all transactions for an account
router.get("/account/:accountId", validateUUID("accountId"), validate(schemas.query.accountTransactions, "query"), async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const {
      date_from,
      date_to,
      transaction_type,
      limit = 100,
      offset = 0,
    } = req.query;
    const userId = req.userId;

    // Verify account ownership
    const accountOwns = await verifyOwnership(
      query,
      "accounts",
      accountId,
      userId
    );
    if (!accountOwns) {
      throw new AppError("NOT_FOUND", "Account not found", 404);
    }

    let sql = `SELECT at.* FROM account_transactions at 
               JOIN accounts a ON at.account_id = a.id 
               WHERE at.account_id = $1 AND a.user_id = $2`;
    const params = [accountId, userId];
    let paramCount = 3;

    if (date_from) {
      sql += ` AND transaction_date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      sql += ` AND transaction_date <= $${paramCount++}`;
      params.push(date_to);
    }

    if (transaction_type) {
      sql += ` AND transaction_type = $${paramCount++}`;
      params.push(transaction_type);
    }

    sql += ` ORDER BY transaction_date DESC, created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM account_transactions at 
       JOIN accounts a ON at.account_id = a.id 
       WHERE at.account_id = $1 AND a.user_id = $2`,
      [accountId, userId]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await query(
      `SELECT at.* FROM account_transactions at 
       JOIN accounts a ON at.account_id = a.id 
       WHERE at.id = $1 AND a.user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Transaction not found", 404);
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create transaction (and update account balance)
router.post(
  "/",
  validate(schemas.accountTransaction.create),
  async (req, res, next) => {
    try {
      const sanitizedBody = sanitizeRequestBody(req.body);
      const {
        account_id,
        transaction_type,
        amount,
        description,
        trade_id,
        transaction_date,
      } = sanitizedBody;
      const userId = req.userId;

      // Verify account ownership
      const accountOwns = await verifyOwnership(
        query,
        "accounts",
        account_id,
        userId
      );
      if (!accountOwns) {
        throw new AppError("NOT_FOUND", "Account not found", 404);
      }

      // If trade_id is provided, verify trade ownership
      if (trade_id) {
        const tradeOwns = await verifyOwnership(
          query,
          "trades",
          trade_id,
          userId
        );
        if (!tradeOwns) {
          throw new AppError("NOT_FOUND", "Trade not found", 404);
        }
      }

      if (!["deposit", "withdrawal", "trade_pnl"].includes(transaction_type)) {
        throw new AppError(
          "INVALID_VALUE",
          'transaction_type must be "deposit", "withdrawal", or "trade_pnl"'
        );
      }

      const newTransaction = await dbTransaction(async (client) => {
        // Insert transaction
        const transResult = await client.query(
          `INSERT INTO account_transactions (
          account_id, transaction_type, amount, description, trade_id, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            account_id,
            transaction_type,
            amount,
            description || null,
            trade_id || null,
            transaction_date,
          ]
        );

        // Update account balance
        let balanceChange = parseFloat(amount);
        if (transaction_type === "withdrawal") {
          balanceChange = -balanceChange;
        }

        await client.query(
          "UPDATE accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [balanceChange, account_id]
        );

        return transResult.rows[0];
      });

      res.status(201).json({ data: newTransaction });
    } catch (error) {
      next(error);
    }
  }
);

// Update transaction (and adjust account balance)
router.put(
  "/:id",
  validateUUID("id"),
  validate(schemas.accountTransaction.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const sanitizedBody = sanitizeRequestBody(req.body);
      const { amount, description, transaction_date } = sanitizedBody;
      const userId = req.userId;

      // Get existing transaction and verify account ownership
      const existingResult = await query(
        `SELECT at.*, a.user_id as account_user_id 
         FROM account_transactions at 
         JOIN accounts a ON at.account_id = a.id 
         WHERE at.id = $1`,
        [id]
      );
      if (existingResult.rows.length === 0) {
        throw new AppError("NOT_FOUND", "Transaction not found", 404);
      }

      const existing = existingResult.rows[0];
      if (existing.account_user_id !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "Transaction does not belong to user",
          403
        );
      }

      await dbTransaction(async (client) => {
        // Revert old balance change
        let oldBalanceChange = parseFloat(existing.amount);
        if (existing.transaction_type === "withdrawal") {
          oldBalanceChange = -oldBalanceChange;
        }

        await client.query(
          "UPDATE accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [oldBalanceChange, existing.account_id]
        );

        // Update transaction
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (amount !== undefined) {
          updates.push(`amount = $${paramCount++}`);
          params.push(amount);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramCount++}`);
          params.push(description);
        }
        if (transaction_date !== undefined) {
          updates.push(`transaction_date = $${paramCount++}`);
          params.push(transaction_date);
        }

        if (updates.length === 0) {
          throw new AppError("MISSING_FIELDS", "No fields to update");
        }

        params.push(id);
        const newAmount = amount !== undefined ? amount : existing.amount;

        await client.query(
          `UPDATE account_transactions SET ${updates.join(
            ", "
          )} WHERE id = $${paramCount} RETURNING *`,
          params
        );

        // Apply new balance change
        let newBalanceChange = parseFloat(newAmount);
        if (existing.transaction_type === "withdrawal") {
          newBalanceChange = -newBalanceChange;
        }

        await client.query(
          "UPDATE accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newBalanceChange, existing.account_id]
        );
      });

      const updatedResult = await query(
        `SELECT at.* FROM account_transactions at 
         JOIN accounts a ON at.account_id = a.id 
         WHERE at.id = $1 AND a.user_id = $2`,
        [id, userId]
      );
      res.json({ data: updatedResult.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// Delete transaction (and revert account balance)
router.delete("/:id", validateUUID("id"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get transaction before deleting and verify account ownership
    const existingResult = await query(
      `SELECT at.*, a.user_id as account_user_id 
       FROM account_transactions at 
       JOIN accounts a ON at.account_id = a.id 
       WHERE at.id = $1`,
      [id]
    );
    if (existingResult.rows.length === 0) {
      throw new AppError("NOT_FOUND", "Transaction not found", 404);
    }

    const existing = existingResult.rows[0];
    if (existing.account_user_id !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "Transaction does not belong to user",
        403
      );
    }

    await dbTransaction(async (client) => {
      // Revert balance change
      let balanceChange = parseFloat(existing.amount);
      if (existing.transaction_type === "withdrawal") {
        balanceChange = -balanceChange;
      } else if (existing.transaction_type === "deposit") {
        balanceChange = -balanceChange;
      } else if (existing.transaction_type === "trade_pnl") {
        balanceChange = -balanceChange;
      }

      await client.query(
        "UPDATE accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [balanceChange, existing.account_id]
      );

      // Delete transaction
      await client.query("DELETE FROM account_transactions WHERE id = $1", [
        id,
      ]);
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
