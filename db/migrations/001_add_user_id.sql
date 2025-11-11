-- Migration: Add user_id columns to all tables
-- This migration adds user_id support for multi-user isolation
-- Note: This migration adds nullable columns first, then makes them NOT NULL
-- If you have existing data, you'll need to populate user_id before running the NOT NULL constraint

-- Add user_id to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID;
-- After populating user_id values, uncomment the line below:
-- ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Add user_id to strategies
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE strategies ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);

-- Add user_id to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE tags ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
-- Remove unique constraint on name, make it unique per user instead
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name) WHERE user_id IS NOT NULL;

-- Add user_id to trading_rules
ALTER TABLE trading_rules ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE trading_rules ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trading_rules_user_id ON trading_rules(user_id);

-- Add user_id to trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE trades ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);

-- Add user_id to analysis
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE analysis ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON analysis(user_id);

-- Add user_id to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
-- Update unique constraint to include user_id
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_user_month ON goals(user_id, month) WHERE user_id IS NOT NULL;

-- Add user_id to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
-- Update unique constraint to include user_id
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key) WHERE user_id IS NOT NULL;

-- Note: accounts table already has user_id via trade_accounts relationship
-- But we add it directly to accounts for direct user ownership

