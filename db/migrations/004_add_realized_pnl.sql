-- Migration: Add optional realized_pnl to trades for manual P/L override
-- When set, this value is shown in the trade log instead of the calculated P/L.

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS realized_pnl DECIMAL(15, 2);

COMMENT ON COLUMN trades.realized_pnl IS 'Optional manual P/L override; when set, displayed instead of calculated P/L';
