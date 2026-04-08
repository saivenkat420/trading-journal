-- Migration: Add AI insights cache table
-- This table stores cached AI analysis results to improve performance

CREATE TABLE IF NOT EXISTS ai_insights_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, insight_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_user_id ON ai_insights_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_type ON ai_insights_cache(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires ON ai_insights_cache(expires_at);
