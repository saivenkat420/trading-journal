-- Migration: Add P/L calculation fields to trades table
-- Adds fields needed for accurate asset-specific P/L calculations

-- Add fees column (for all asset classes)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS fees DECIMAL(15, 2) DEFAULT 0.00;

-- Add contract_size column (for Forex, CFDs)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS contract_size DECIMAL(15, 2);

-- Add point_value column (for Futures)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS point_value DECIMAL(15, 2);

-- Add contract_multiplier column (for Options - future use)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS contract_multiplier DECIMAL(10, 2) DEFAULT 100.00;

-- Add face_value column (for Bonds - future use)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS face_value DECIMAL(15, 2);

-- Add interest column (for Bonds - future use)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS interest DECIMAL(15, 2) DEFAULT 0.00;

-- Add unit_size column (for Commodities)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS unit_size DECIMAL(15, 2) DEFAULT 1.00;

-- Add comments for documentation
COMMENT ON COLUMN trades.fees IS 'Trading fees/commissions (applies to all asset classes)';
COMMENT ON COLUMN trades.contract_size IS 'Contract size for Forex (e.g., 100000 for standard lot) or CFDs';
COMMENT ON COLUMN trades.point_value IS 'Point value for Futures contracts (e.g., 50 for E-mini S&P)';
COMMENT ON COLUMN trades.contract_multiplier IS 'Contract multiplier for Options (typically 100)';
COMMENT ON COLUMN trades.face_value IS 'Face value for Bonds';
COMMENT ON COLUMN trades.interest IS 'Accrued interest for Bonds';
COMMENT ON COLUMN trades.unit_size IS 'Unit size for Commodities (e.g., 1 oz for gold)';

