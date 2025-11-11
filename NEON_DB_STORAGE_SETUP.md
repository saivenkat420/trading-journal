# Neon Database File Storage Setup

## Overview

Files are now stored **directly in Neon database** as binary data (bytea type). This eliminates the need for:

- ❌ Local file storage
- ❌ Cloud storage services (Supabase, S3, etc.)
- ❌ File system management

Everything is stored in your Neon PostgreSQL database!

## Database Schema Changes

### Migration Required

Run this migration in your Neon SQL Editor:

```sql
-- Add file_data columns to store files directly in database
ALTER TABLE trade_files
ADD COLUMN IF NOT EXISTS file_data BYTEA;

ALTER TABLE analysis_files
ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_trade_files_path ON trade_files(file_path);
CREATE INDEX IF NOT EXISTS idx_analysis_files_path ON analysis_files(file_path);
```

Or use the migration file: `db/migrations/003_add_file_data_columns.sql`

## How It Works

### File Upload Flow

1. **Client uploads file** → Multer receives it in memory
2. **File validation** → Checks MIME type, extension, filename
3. **Store in database** → File binary data stored as `bytea` in `file_data` column
4. **Metadata stored** → `file_name`, `file_path` (reference), `file_size`, `file_type`

### File Serving Flow

1. **Request file** → `/api/files/serve/:filename`
2. **Query database** → Get file data from `file_data` column
3. **Verify ownership** → Check user has access to the file
4. **Send file** → Return binary data with appropriate headers

### File Deletion Flow

1. **Delete record** → Remove row from `trade_files` or `analysis_files`
2. **Automatic cleanup** → `file_data` is automatically deleted (no separate cleanup needed)

## Configuration

### Environment Variables

No special configuration needed! The system automatically uses Neon database storage.

Optional (for file size limits):

```bash
# Max file size (default: 5MB)
MAX_FILE_SIZE=5242880
```

### Database Columns

**trade_files table:**

- `file_data` (BYTEA) - Binary file content
- `file_name` (VARCHAR) - Original filename
- `file_path` (VARCHAR) - Reference identifier
- `file_size` (INTEGER) - File size in bytes
- `file_type` (VARCHAR) - MIME type

**analysis_files table:**

- Same structure as trade_files
- Plus `symbol` (VARCHAR) - Optional symbol association

## Benefits

✅ **Simple**: Everything in one place (Neon database)  
✅ **No external services**: No need for S3, Supabase Storage, etc.  
✅ **Automatic backups**: Files backed up with database  
✅ **Transaction safety**: File operations are part of database transactions  
✅ **No file system**: Works on serverless platforms  
✅ **Easy migration**: Just run the SQL migration

## Limitations & Considerations

⚠️ **Database Size**: Files stored in database will increase database size

- Each file is stored as binary data
- Monitor your Neon database storage quota
- Consider file size limits (recommended: < 5MB per file)

⚠️ **Performance**:

- Very small files (< 1MB): Excellent performance
- Medium files (1-5MB): Good performance
- Large files (> 5MB): May be slower, consider external storage

⚠️ **Backup/Restore**:

- Database backups include all files
- Restore includes all files automatically
- But backup size will be larger

## File Size Recommendations

- **Images**: PNG, JPEG up to 5MB each ✅
- **PDFs**: Up to 5MB each ✅
- **Text files**: CSV, TXT files ✅
- **Large files**: Consider external storage if > 5MB

## Migration from Local/Cloud Storage

If you have existing files in local storage or cloud storage:

1. **Option 1**: Keep old files, new uploads go to database

   - Old files remain in old storage
   - New files stored in database

2. **Option 2**: Migrate existing files to database
   - Write a script to read files from old storage
   - Upload to database using the same INSERT queries
   - Update file_path references

## Testing

1. **Upload a file** through the API
2. **Check database**: Query `trade_files` or `analysis_files` table
3. **Verify file_data**: Should contain binary data
4. **Download file**: Use `/api/files/serve/:filename` endpoint
5. **Verify file**: Downloaded file should match original

## Example Queries

### Check file storage

```sql
SELECT
  id,
  file_name,
  file_size,
  file_type,
  LENGTH(file_data) as stored_size
FROM trade_files
LIMIT 5;
```

### Get total storage used

```sql
SELECT
  SUM(LENGTH(file_data)) as total_bytes,
  SUM(LENGTH(file_data)) / 1024.0 / 1024.0 as total_mb
FROM (
  SELECT file_data FROM trade_files
  UNION ALL
  SELECT file_data FROM analysis_files
) all_files;
```

## Troubleshooting

### Files not uploading

- Check file size is within limits
- Verify file type is allowed
- Check database connection

### Files not serving

- Verify `file_data` column exists
- Check file ownership (user_id)
- Verify file_path matches

### Database size growing quickly

- Monitor file sizes
- Consider archiving old files
- Set stricter file size limits

## Summary

✅ **Files stored in Neon database as bytea**  
✅ **No external storage needed**  
✅ **Simple and integrated**  
✅ **Automatic backups**  
✅ **Works everywhere**

Your file storage is now completely integrated with your Neon database!
