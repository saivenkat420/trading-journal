-- Migration: Add file_data columns to store files directly in database
-- This allows storing files as binary data (bytea) in Neon DB

-- Add file_data column to trade_files table
ALTER TABLE trade_files 
ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Add file_data column to analysis_files table
ALTER TABLE analysis_files 
ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Add index on file_path for faster lookups (file_path will still be used for reference)
CREATE INDEX IF NOT EXISTS idx_trade_files_path ON trade_files(file_path);
CREATE INDEX IF NOT EXISTS idx_analysis_files_path ON analysis_files(file_path);

-- Note: file_path will now store a reference/identifier, not a filesystem path
-- file_data will contain the actual binary file content

