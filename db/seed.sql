-- Seed Data for The DT Journal
-- Sample data for testing and development
-- Note: Uses a sample user_id for all seed data. Replace with actual user_id in production.

-- Sample user_id for seed data (replace with actual user_id in production)
-- Using a fixed UUID for consistency
DO $$
DECLARE
    sample_user_id UUID := '00000000-0000-0000-0000-000000000001';
    -- Password hash for "password123" (bcrypt)
    sample_password_hash VARCHAR(255) := '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
BEGIN
    -- Insert sample user (password: password123)
    -- Generated with: bcrypt.hash('password123', 10)
    INSERT INTO users (id, email, password_hash, username, first_name, last_name, is_active, is_email_verified)
    VALUES (
        sample_user_id,
        'demo@example.com',
        '$2b$10$Ojh9vmWrfQepogrLKrhLxuLL5gVshGCIkeTXTRmOMIGBjqISNQfI2',
        'demo_user',
        'Demo',
        'User',
        true,
        true
    )
    ON CONFLICT (email) DO NOTHING;
    -- Insert sample accounts
    INSERT INTO accounts (id, user_id, name, initial_balance, current_balance) VALUES
        ('a1b2c3d4-e5f6-4789-a012-345678901234', sample_user_id, 'Main Trading Account', 10000.00, 12500.00),
        ('b2c3d4e5-f6a7-4890-b123-456789012345', sample_user_id, 'Swing Trading Account', 5000.00, 4800.00),
        ('c3d4e5f6-a7b8-4901-c234-567890123456', sample_user_id, 'Day Trading Account', 20000.00, 21500.00);

    -- Insert sample strategies
    INSERT INTO strategies (id, user_id, name, description) VALUES
        ('s1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, 'Breakout Strategy', 'Trading breakouts from key support/resistance levels'),
        ('s2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, 'Mean Reversion', 'Trading mean reversion in ranging markets'),
        ('s3c4d5e6-f7a8-4901-c234-567890123456', sample_user_id, 'Trend Following', 'Following strong trends with momentum indicators');

    -- Insert sample tags
    INSERT INTO tags (id, user_id, name, color) VALUES
        ('t1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, 'High Confidence', '#10b981'),
        ('t2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, 'Low Confidence', '#ef4444'),
        ('t3c4d5e6-f7a8-4901-c234-567890123456', sample_user_id, 'Revenge Trade', '#f59e0b'),
        ('t4d5e6f7-a8b9-4012-d345-678901234567', sample_user_id, 'Emotional', '#8b5cf6'),
        ('t5e6f7a8-b9c0-4123-e456-789012345678', sample_user_id, 'Plan Followed', '#3b82f6');

    -- Insert sample trading rules
    INSERT INTO trading_rules (id, user_id, name, description, rule_type, is_active) VALUES
        ('r1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, 'Max Risk Per Trade', 'Never risk more than 2% of account on a single trade', 'risk', true),
        ('r2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, 'Stop Loss Required', 'Always set a stop loss before entering a trade', 'entry', true),
        ('r3c4d5e6-f7a8-4901-c234-567890123456', sample_user_id, 'No Revenge Trading', 'Do not trade immediately after a loss', 'psychology', true),
        ('r4d5e6f7-a8b9-4012-d345-678901234567', sample_user_id, 'Trade During Market Hours', 'Only trade during high liquidity hours', 'entry', true);

    -- Insert sample trades
    INSERT INTO trades (id, user_id, symbol, asset_class, trade_type, position_size, entry_price, exit_price, stop_loss, take_profit, date, strategy_id, notes, reflection, status) VALUES
        ('tr1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, 'ES', 'futures', 'long', 2.0, 4500.00, 4525.00, 4490.00, 4530.00, '2025-11-01', 's1a2b3c4-d5e6-4789-a012-345678901234', 'Strong breakout above 4500 resistance. High volume confirmation.', 'Good entry timing. Should have let it run longer. Target was conservative.', 'reviewed'),
        ('tr2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, 'EURUSD', 'forex', 'short', 1.0, 1.0850, 1.0820, 1.0870, 1.0800, '2025-11-02', 's2b3c4d5-e6f7-4890-b123-456789012345', 'Overbought on RSI. Mean reversion setup.', 'Perfect entry. Exited too early though.', 'reviewed'),
        ('tr3c4d5e6-f7a8-4901-c234-567890123456', sample_user_id, 'XAUUSD', 'forex', 'long', 0.5, 2650.00, 2640.00, 2635.00, 2670.00, '2025-11-03', 's3c4d5e6-f7a8-4901-c234-567890123456', 'Trend continuation. Strong momentum.', 'Stop loss hit. Should have waited for better entry.', 'reviewed'),
        ('tr4d5e6f7-a8b9-4012-d345-678901234567', sample_user_id, 'ES', 'futures', 'long', 1.0, 4510.00, NULL, 4495.00, 4540.00, '2025-11-08', 's1a2b3c4-d5e6-4789-a012-345678901234', 'Breakout retest. Entered on pullback.', NULL, 'open'),
        ('tr5e6f7a8-b9c0-4123-e456-789012345678', sample_user_id, 'US100', 'futures', 'short', 2.0, 18500.00, 18450.00, 18550.00, 18400.00, '2025-11-05', 's2b3c4d5-e6f7-4890-b123-456789012345', 'Resistance rejection. Short setup.', 'Good trade. Followed the plan perfectly.', 'reviewed');

    -- Insert trade tags
    INSERT INTO trade_tags (trade_id, tag_id) VALUES
        ('tr1a2b3c4-d5e6-4789-a012-345678901234', 't1a2b3c4-d5e6-4789-a012-345678901234'), -- High Confidence
        ('tr1a2b3c4-d5e6-4789-a012-345678901234', 't5e6f7a8-b9c0-4123-e456-789012345678'), -- Plan Followed
        ('tr2b3c4d5-e6f7-4890-b123-456789012345', 't1a2b3c4-d5e6-4789-a012-345678901234'), -- High Confidence
        ('tr3c4d5e6-f7a8-4901-c234-567890123456', 't2b3c4d5-e6f7-4890-b123-456789012345'), -- Low Confidence
        ('tr4d5e6f7-a8b9-4012-d345-678901234567', 't1a2b3c4-d5e6-4789-a012-345678901234'), -- High Confidence
        ('tr5e6f7a8-b9c0-4123-e456-789012345678', 't5e6f7a8-b9c0-4123-e456-789012345678'); -- Plan Followed

    -- Insert trade accounts (P&L distribution)
    INSERT INTO trade_accounts (trade_id, account_id, pnl) VALUES
        ('tr1a2b3c4-d5e6-4789-a012-345678901234', 'a1b2c3d4-e5f6-4789-a012-345678901234', 50.00),
        ('tr2b3c4d5-e6f7-4890-b123-456789012345', 'a1b2c3d4-e5f6-4789-a012-345678901234', 30.00),
        ('tr3c4d5e6-f7a8-4901-c234-567890123456', 'b2c3d4e5-f6a7-4890-b123-456789012345', -5.00),
        ('tr4d5e6f7-a8b9-4012-d345-678901234567', 'a1b2c3d4-e5f6-4789-a012-345678901234', 0.00), -- Open trade
        ('tr5e6f7a8-b9c0-4123-e456-789012345678', 'c3d4e5f6-a7b8-4901-c234-567890123456', 100.00);

    -- Insert account transactions
    INSERT INTO account_transactions (account_id, transaction_type, amount, description, trade_id, transaction_date) VALUES
        ('a1b2c3d4-e5f6-4789-a012-345678901234', 'deposit', 10000.00, 'Initial deposit', NULL, '2025-10-01'),
        ('a1b2c3d4-e5f6-4789-a012-345678901234', 'trade_pnl', 50.00, 'Trade P&L', 'tr1a2b3c4-d5e6-4789-a012-345678901234', '2025-11-01'),
        ('a1b2c3d4-e5f6-4789-a012-345678901234', 'trade_pnl', 30.00, 'Trade P&L', 'tr2b3c4d5-e6f7-4890-b123-456789012345', '2025-11-02'),
        ('b2c3d4e5-f6a7-4890-b123-456789012345', 'deposit', 5000.00, 'Initial deposit', NULL, '2025-10-01'),
        ('b2c3d4e5-f6a7-4890-b123-456789012345', 'trade_pnl', -5.00, 'Trade P&L', 'tr3c4d5e6-f7a8-4901-c234-567890123456', '2025-11-03'),
        ('c3d4e5f6-a7b8-4901-c234-567890123456', 'deposit', 20000.00, 'Initial deposit', NULL, '2025-10-01'),
        ('c3d4e5f6-a7b8-4901-c234-567890123456', 'trade_pnl', 100.00, 'Trade P&L', 'tr5e6f7a8-b9c0-4123-e456-789012345678', '2025-11-05');

    -- Insert sample analysis
    INSERT INTO analysis (id, user_id, timeframe, custom_title, start_date, end_date, major_news_events, symbols_analysis, performance_context) VALUES
        ('an1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, 'weekly', NULL, '2025-11-04', '2025-11-08', 
         '[]'::jsonb,
         '[{"symbol": "ES", "context": "Bullish above 4500. Key support at 4480.", "images": []}]'::jsonb,
         'Good week overall. 3 wins, 1 loss. Need to work on exit timing.'),
        ('an2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, 'custom', 'Q4 2025 Review', '2025-10-01', '2025-12-31',
         '[{"event": "FOMC Meeting", "date": "2025-11-06", "time": "14:00", "impact": "high"}]'::jsonb,
         '[{"symbol": "EURUSD", "context": "Range bound between 1.08-1.09. Waiting for breakout.", "images": []}]'::jsonb,
         'Quarter started strong. Focusing on consistency.');

    -- Insert sample goals
    INSERT INTO goals (id, user_id, month, profit_goal, win_rate_goal) VALUES
        ('g1a2b3c4-d5e6-4789-a012-345678901234', sample_user_id, '2025-11-01', 500.00, 60.00),
        ('g2b3c4d5-e6f7-4890-b123-456789012345', sample_user_id, '2025-10-01', 1000.00, 65.00);

    -- Insert default settings
    INSERT INTO settings (user_id, key, value) VALUES
        (sample_user_id, 'theme', 'dark'),
        (sample_user_id, 'trader_nickname', 'Trader'),
        (sample_user_id, 'default_account', 'a1b2c3d4-e5f6-4789-a012-345678901234');
END $$;

