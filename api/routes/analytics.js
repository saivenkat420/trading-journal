// Analytics routes
import express from "express";
import { query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../utils/validation.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get("/dashboard", validate(schemas.query.analytics, "query"), async (req, res, next) => {
  try {
    const { date_from, date_to, account_id } = req.query;
    const userId = req.userId;

    // Derive PnL from trade prices if account P&L not recorded yet.
    // This makes the dashboard reflect the trade log even when account allocations weren't added.
    let sql = `
      WITH derived AS (
        SELECT 
          t.id,
          CASE 
            WHEN t.exit_price IS NULL OR t.entry_price IS NULL THEN 0
            WHEN t.trade_type = 'long' THEN (t.exit_price - t.entry_price) * t.position_size
            ELSE (t.entry_price - t.exit_price) * t.position_size
          END AS dpnl
        FROM trades t
        WHERE t.user_id = $1
      )
      SELECT 
        COALESCE(SUM(COALESCE(ta.pnl, d.dpnl)), 0) as net_pl,
        COUNT(DISTINCT t.id) as total_trades,
        COUNT(DISTINCT CASE WHEN COALESCE(ta.pnl, d.dpnl) > 0 THEN t.id END) as total_wins,
        COUNT(DISTINCT CASE WHEN COALESCE(ta.pnl, d.dpnl) < 0 THEN t.id END) as total_losses,
        COALESCE(AVG(CASE WHEN COALESCE(ta.pnl, d.dpnl) > 0 THEN COALESCE(ta.pnl, d.dpnl) END), 0) as average_win,
        COALESCE(AVG(CASE WHEN COALESCE(ta.pnl, d.dpnl) < 0 THEN COALESCE(ta.pnl, d.dpnl) END), 0) as average_loss
      FROM trades t
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      LEFT JOIN derived d ON d.id = t.id
      WHERE t.user_id = $1
    `;

    const params = [userId];
    let paramCount = 2;

    if (date_from) {
      sql += ` AND t.date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      sql += ` AND t.date <= $${paramCount++}`;
      params.push(date_to);
    }

    if (account_id) {
      // Verify account belongs to user
      const accountCheck = await query(
        "SELECT user_id FROM accounts WHERE id = $1",
        [account_id]
      );
      if (
        accountCheck.rows.length === 0 ||
        accountCheck.rows[0].user_id !== userId
      ) {
        throw new AppError("FORBIDDEN", "Account does not belong to user", 403);
      }
      sql += ` AND ta.account_id = $${paramCount++}`;
      params.push(account_id);
    }

    const result = await query(sql, params);
    const stats = result.rows[0];

    const totalTrades = parseInt(stats.total_trades) || 0;
    const totalWins = parseInt(stats.total_wins) || 0;
    const totalLosses = parseInt(stats.total_losses) || 0;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

    // Calculate average R:R (Risk:Reward)
    let avgRR = 0;
    if (totalWins > 0 && totalLosses > 0) {
      const avgWin = parseFloat(stats.average_win) || 0;
      const avgLoss = Math.abs(parseFloat(stats.average_loss) || 0);
      if (avgLoss > 0) {
        avgRR = avgWin / avgLoss;
      }
    }

    res.json({
      data: {
        net_pl: parseFloat(stats.net_pl) || 0,
        win_rate: parseFloat(winRate.toFixed(2)),
        avg_rr: parseFloat(avgRR.toFixed(2)),
        average_win: parseFloat(stats.average_win) || 0,
        average_loss: parseFloat(stats.average_loss) || 0,
        total_trades: totalTrades,
        total_wins: totalWins,
        total_losses: totalLosses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get insights
router.get("/insights", validate(schemas.query.analytics, "query"), async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const userId = req.userId;

    let sql = `
      SELECT 
        t.symbol,
        t.asset_class,
        COUNT(*) as trade_count,
        SUM(ta.pnl) as total_pnl,
        AVG(ta.pnl) as avg_pnl,
        COUNT(CASE WHEN ta.pnl > 0 THEN 1 END) as wins,
        COUNT(CASE WHEN ta.pnl < 0 THEN 1 END) as losses
      FROM trades t
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      WHERE t.status IN ('closed', 'reviewed') AND t.user_id = $1
    `;

    const params = [userId];
    let paramCount = 2;

    if (date_from) {
      sql += ` AND t.date >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      sql += ` AND t.date <= $${paramCount++}`;
      params.push(date_to);
    }

    sql += ` GROUP BY t.symbol, t.asset_class ORDER BY total_pnl DESC`;

    const result = await query(sql, params);

    // Get best/worst trades
    let bestTradeSql = `
      SELECT t.*, SUM(ta.pnl) as total_pnl
      FROM trades t
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      WHERE t.status IN ('closed', 'reviewed') AND t.user_id = $1
    `;
    let bestTradeParams = [userId];
    let bestParamCount = 2;

    if (date_from) {
      bestTradeSql += ` AND t.date >= $${bestParamCount++}`;
      bestTradeParams.push(date_from);
    }
    if (date_to) {
      bestTradeSql += ` AND t.date <= $${bestParamCount++}`;
      bestTradeParams.push(date_to);
    }
    bestTradeSql += ` GROUP BY t.id ORDER BY total_pnl DESC LIMIT 1`;

    const bestTradeResult = await query(bestTradeSql, bestTradeParams);

    let worstTradeSql = `
      SELECT t.*, SUM(ta.pnl) as total_pnl
      FROM trades t
      LEFT JOIN trade_accounts ta ON t.id = ta.trade_id
      WHERE t.status IN ('closed', 'reviewed') AND t.user_id = $1
    `;
    let worstTradeParams = [userId];
    let worstParamCount = 2;

    if (date_from) {
      worstTradeSql += ` AND t.date >= $${worstParamCount++}`;
      worstTradeParams.push(date_from);
    }
    if (date_to) {
      worstTradeSql += ` AND t.date <= $${worstParamCount++}`;
      worstTradeParams.push(date_to);
    }
    worstTradeSql += ` GROUP BY t.id ORDER BY total_pnl ASC LIMIT 1`;

    const worstTradeResult = await query(worstTradeSql, worstTradeParams);

    res.json({
      data: {
        by_symbol: result.rows,
        best_trade: bestTradeResult.rows[0] || null,
        worst_trade: worstTradeResult.rows[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
