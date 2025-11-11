# Trading Journal API

RESTful API server for Trading Journal trading journal application.

## Features

- **Trades Management**: Create, read, update, and delete trades with file uploads
- **Accounts Management**: Manage trading accounts with balance tracking
- **Analytics**: Dashboard statistics and insights
- **Strategies**: Trading strategy management
- **Tags**: Tag system for organizing trades
- **Trading Rules**: Trading rules management
- **Analysis**: Market analysis entries with file uploads
- **Goals**: Monthly goals tracking
- **Settings**: Application settings
- **File Management**: File upload and serving for trades and analysis
- **Account Transactions**: Track account balance changes

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up your database using the schema in `../db/schema.sql`

   **For Neon database setup**, run `db/schema.sql` in Neon SQL Editor.

3. Configure environment variables:

```bash
# For Neon (or any PostgreSQL database):
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
```

4. Start the server:

```bash
npm run dev
```

## API Endpoints

### Trades

- `GET /api/trades` - List all trades (with filters: status, symbol, date_from, date_to)
- `GET /api/trades/:id` - Get trade by ID
- `POST /api/trades` - Create trade (supports file uploads, multipart/form-data)
- `PUT /api/trades/:id` - Update trade (supports file uploads)
- `DELETE /api/trades/:id` - Delete trade (reverts account balances)

### Accounts

- `GET /api/accounts` - List all accounts
- `GET /api/accounts/:id` - Get account by ID
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account (if no associated trades)

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/insights` - Get trading insights

### Strategies

- `GET /api/strategies` - List all strategies
- `GET /api/strategies/:id` - Get strategy by ID
- `POST /api/strategies` - Create strategy
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy (if no associated trades)

### Tags

- `GET /api/tags` - List all tags
- `GET /api/tags/:id` - Get tag by ID
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

### Trading Rules

- `GET /api/trading-rules` - List trading rules (filter: is_active)
- `POST /api/trading-rules` - Create trading rule
- `PUT /api/trading-rules/:id` - Update trading rule

### Analysis

- `GET /api/analysis` - List analysis entries (filters: timeframe, date_from, date_to)
- `GET /api/analysis/:id` - Get analysis by ID
- `POST /api/analysis` - Create analysis (supports file uploads)
- `PUT /api/analysis/:id` - Update analysis (supports file uploads)
- `DELETE /api/analysis/:id` - Delete analysis

### Goals

- `GET /api/goals` - List goals (filter: month)
- `POST /api/goals` - Create or update goal for a month
- `PUT /api/goals/:id` - Update goal

### Settings

- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `PUT /api/settings/:key` - Update setting

### Files

- `GET /api/files/trades/:tradeId` - Get files for a trade
- `GET /api/files/analysis/:analysisId` - Get files for an analysis
- `GET /api/files/serve/:filename` - Serve a file
- `DELETE /api/files/trades/:fileId` - Delete trade file
- `DELETE /api/files/analysis/:fileId` - Delete analysis file

### Account Transactions

- `GET /api/account-transactions/account/:accountId` - Get transactions for an account
- `GET /api/account-transactions/:id` - Get transaction by ID
- `POST /api/account-transactions` - Create transaction (updates account balance)
- `PUT /api/account-transactions/:id` - Update transaction (adjusts account balance)
- `DELETE /api/account-transactions/:id` - Delete transaction (reverts account balance)

## File Uploads

File uploads are supported for trades and analysis entries:

- **Max file size**: 5MB per file
- **Allowed types**: PNG, JPEG, JPG, GIF
- **Max files per trade**: 8
- **Max files per analysis**: 20

Files are stored in the `uploads/` directory (configurable via `LOCAL_STORAGE_PATH`).

## Account Balance Management

Account balances are automatically updated when:

- Trades are created with account P&Ls
- Trades are updated with new account P&Ls
- Trades are deleted (balances are reverted)
- Account transactions are created/updated/deleted

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:

- `NOT_FOUND` - Resource not found
- `MISSING_FIELDS` - Required fields missing
- `INVALID_VALUE` - Invalid value provided
- `DUPLICATE_ENTRY` - Unique constraint violation
- `FOREIGN_KEY_VIOLATION` - Referenced record doesn't exist
- `CONFLICT` - Cannot delete due to dependencies

## Database

The API uses PostgreSQL. See `../db/schema.sql` for the database schema.

## Authentication

Currently, authentication is a placeholder. In production, you should:

1. Implement JWT token verification
2. Add user_id filtering to all routes
3. Use the `authenticate` middleware from `utils/auth.js`

For development, you can pass `x-user-id` header to simulate user context.

## Supabase Integration

The project supports Supabase for database and future features (auth, storage, realtime).

**Connection Methods:**

1. **Connection String** (Recommended): Set `DATABASE_URL` or `SUPABASE_DB_URL` environment variable
2. **Traditional Config**: Set individual database connection parameters

**Supabase Client:**
The Supabase JavaScript client is available via `utils/supabase.js` for:

- Authentication (future)
- Storage (file uploads)
- Realtime subscriptions (future)

**Using Supabase:**

```javascript
import { getSupabaseClient, isSupabaseConfigured } from "./utils/supabase.js";

if (isSupabaseConfigured()) {
  const supabase = getSupabaseClient();
  // Use Supabase features
}
```

The Supabase client is optional and can be used for additional features like storage and realtime subscriptions.
