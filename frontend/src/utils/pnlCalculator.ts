// P/L Calculation utility based on asset-specific formulas
import { Trade } from "../types";

/**
 * Calculate profit/loss for a trade based on asset class and formula
 * Uses exact formulas as specified:
 * - Forex: (Exit−Entry) × Contract Size × Lots (default Contract Size = 10)
 * - Commodities: (Exit−Entry) × Contract Size × Contracts (default Contract Size = 100)
 * - Crypto: (Exit−Entry) × Quantity
 * - Futures: (Exit−Entry) × Multiplier × Contracts (default Point Value = 20)
 * - Stocks: (Exit−Entry) × Number of Shares
 */
export function calculateTradePnl(trade: Trade): number {
  // Manual P/L override (e.g. from trade log inline edit)
  if (trade.realized_pnl != null && trade.realized_pnl !== undefined) {
    return Number(trade.realized_pnl);
  }
  // If account-level P/L is provided, use that (most accurate)
  if (trade.accounts && trade.accounts.length > 0) {
    return trade.accounts.reduce((sum, acc) => sum + Number(acc.pnl ?? 0), 0);
  }

  // Need entry and exit prices for calculation
  const entryPrice = trade.entry_price;
  const exitPrice = trade.exit_price;

  if (entryPrice === null || exitPrice === null || exitPrice === undefined) {
    return 0; // Open trade or missing data
  }

  const entry = Number(entryPrice);
  const exit = Number(exitPrice);
  const positionSize = Number(trade.position_size ?? 0);
  const fees = Number((trade as any).fees ?? 0);

  // Determine price difference based on trade direction
  const priceDiff = trade.trade_type === "long" ? exit - entry : entry - exit;

  // Asset-specific calculations using exact formulas
  switch (trade.asset_class) {
    case "stocks":
      // (Exit Price - Entry Price) × Number of Shares
      return priceDiff * positionSize - fees;

    case "forex": {
      // (Exit−Entry) × Contract Size × Lots
      // Default Contract Size = 10
      const contractSize = Number((trade as any).contract_size ?? 10);
      return priceDiff * contractSize * positionSize - fees;
    }

    case "futures": {
      // (Exit−Entry) × Multiplier × Contracts
      // Default Point Value = 20
      const pointValue = Number((trade as any).point_value ?? 20);
      return priceDiff * pointValue * positionSize - fees;
    }

    case "commodity": {
      // (Exit−Entry) × Contract Size × Contracts
      // Default Contract Size = 100
      const contractSize = Number((trade as any).contract_size ?? 100);
      return priceDiff * contractSize * positionSize - fees;
    }

    case "crypto":
      // (Exit−Entry) × Quantity
      return priceDiff * positionSize - fees;

    default:
      // Default fallback: simple calculation
      return priceDiff * positionSize - fees;
  }
}
