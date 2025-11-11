# Trading Journal - Functional Specification

## Executive Summary

This document describes the functional implementation of Trading Journal, a trading journal application. This implementation reproduces the core business logic and data flows of the original application while excluding authentication, user profiles, and daily journal features as specified.

**Critical Differences from Original:**
- No authentication system - all endpoints are accessible without login
- No user-specific data isolation - all data is shared (single-user mode)
- No daily journal feature - this feature was explicitly excluded
- Simplified file upload - basic implementation without Supabase storage integration
- No payment processing - all payment-related flows are stubbed

## Architecture Overview

### Technology Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **API Style:** RESTful JSON API

### Data Flow
1. Frontend makes API calls to Express server
2. Express server queries PostgreSQL database
3. Results returned as JSON to frontend
4. Frontend renders data in React components

## Database Schema

### Core Tables

#### trades
Stores individual trade entries with all trading details.

**Key Fields:**
- `symbol` - Trading symbol (e.g., ES, EURUSD)
- `trade_type` - long or short
- `entry_price`, `exit_price` - Price points
- `position_size` - Contract/lot size
- `status` - open, closed, or reviewed

**Relationships:**
- Many-to-many with `tags` via `trade_tags`
- Many-to-many with `accounts` via `trade_accounts` (for P&L distribution)

#### accounts
Trading accounts with balance tracking.

**Key Fields:**
- `name` - Account name
- `initial_balance`, `current_balance` - Balance tracking

#### strategies
Trading strategies that can be assigned to trades.

#### tags
User-defined tags for categorizing trades.

#### trading_rules
Trading rules and guidelines.

#### analysis
Market analysis entries with timeframe and market data.

#### goals
Monthly goals for profit and win rate.

#### settings
Application settings (theme, nickname, etc.).

## API Endpoints

### Trades
- `GET /api/trades` - List all trades with filters
- `GET /api/trades/:id` - Get single trade
- `POST /api/trades` - Create new trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

**Request Body (POST):**
```json
{
  "symbol": "ES",
  "asset_class": "futures",
  "trade_type": "long",
  "position_size": 2.0,
  "entry_price": 4500.00,
  "exit_price": 4525.00,
  "stop_loss": 4490.00,
  "take_profit": 4530.00,
  "date": "2025-11-09",
  "strategy_id": "uuid",
  "notes": "Entry reasons...",
  "reflection": "Post-trade thoughts...",
  "tag_ids": ["uuid1", "uuid2"],
  "account_pnls": {
    "account-uuid": 50.00
  }
}
```

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/insights` - Trading insights by symbol

**Response (Dashboard):**
```json
{
  "data": {
    "net_pl": 175.00,
    "win_rate": 60.0,
    "avg_rr": 2.5,
    "average_win": 50.00,
    "average_loss": -20.00,
    "total_trades": 5,
    "total_wins": 3,
    "total_losses": 2
  }
}
```

### Accounts
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/:id` - Get account details
- `POST /api/accounts` - Create account

### Strategies
- `GET /api/strategies` - List strategies
- `POST /api/strategies` - Create strategy

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Trading Rules
- `GET /api/trading-rules` - List rules (filter by is_active)
- `POST /api/trading-rules` - Create rule
- `PUT /api/trading-rules/:id` - Update rule

### Analysis
- `GET /api/analysis` - List analysis entries
- `POST /api/analysis` - Create analysis
- `PUT /api/analysis/:id` - Update analysis

### Goals
- `GET /api/goals` - List goals (filter by month)
- `POST /api/goals` - Create/update goal (upsert by month)
- `PUT /api/goals/:id` - Update goal

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `PUT /api/settings/:key` - Update setting

## Frontend Pages

### Dashboard (`/`)
- Displays key statistics (Net P/L, Win Rate, Avg R:R, etc.)
- Shows recent trades
- Links to add new trade

**Data Flow:**
1. Load dashboard stats from `/api/analytics/dashboard`
2. Load recent trades from `/api/trades?limit=5`
3. Render statistics cards and trade table

### Trade Log (`/trade-log`)
- Lists all trades in a table
- Filterable by status, symbol, date range
- Link to add new trade

**Data Flow:**
1. Load trades from `/api/trades`
2. Display in sortable table
3. Link to individual trade details

### Add Trade (`/add-trade`)
- Form to create new trade
- Dropdowns for strategies, tags, accounts
- Text areas for notes and reflection

**Data Flow:**
1. Load options (strategies, tags, accounts) on mount
2. On submit, POST to `/api/trades`
3. Redirect to trade log on success

### Insights (`/insights`)
- Performance breakdown by symbol
- Best/worst trades
- Statistical analysis

**Data Flow:**
1. Load insights from `/api/analytics/insights`
2. Display symbol performance table
3. Show best/worst trade highlights

### Analysis (`/analysis`)
- List of market analysis entries
- Link to create new analysis

**Data Flow:**
1. Load analyses from `/api/analysis`
2. Display as cards with timeframe and dates

### Trading Lab (`/trading-lab`)
- List of active trading rules
- Strategy management (future)

**Data Flow:**
1. Load trading rules from `/api/trading-rules?is_active=true`
2. Display as cards

### Goals (`/goals`)
- Monthly goals display
- Progress tracking
- Performance metrics for selected month

**Data Flow:**
1. Load goals for selected month from `/api/goals?month=YYYY-MM-DD`
2. Load stats for month from `/api/analytics/dashboard?date_from=...&date_to=...`
3. Calculate progress percentages

### Settings (`/settings`)
- Theme toggle (light/dark)
- Trader nickname editing

**Data Flow:**
1. Load settings from `/api/settings`
2. Update via PUT to `/api/settings/:key`

## Business Logic

### P&L Calculation
- P&L is stored per account per trade in `trade_accounts` table
- Total P&L calculated by summing `pnl` from `trade_accounts`
- Dashboard stats aggregate all closed/reviewed trades

### Win Rate Calculation
- Win = trade with positive P&L
- Loss = trade with negative P&L
- Win Rate = (Wins / Total Trades) * 100

### Risk:Reward Ratio
- Average R:R = Average Win / Average Loss
- Only calculated when both wins and losses exist

### Goal Progress
- Profit Goal Progress = (Current Net P&L / Goal) * 100
- Win Rate Progress = (Current Win Rate / Goal) * 100
- Capped at 100%

## Error Handling

### API Errors
All API errors return JSON:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

**Error Codes:**
- `MISSING_FIELDS` - Required fields not provided
- `INVALID_VALUE` - Invalid value for field
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Unique constraint violation
- `FOREIGN_KEY_VIOLATION` - Referenced record doesn't exist
- `INTERNAL_ERROR` - Server error

### Frontend Error Handling
- API errors displayed in console
- User-friendly error messages (future: toast notifications)
- Form validation on client side

## Data Validation

### Trade Validation
- `symbol` - Required, string
- `trade_type` - Required, must be "long" or "short"
- `position_size` - Required, positive number
- `entry_price` - Required, positive number
- `date` - Required, valid date

### Database Constraints
- Foreign key constraints ensure referential integrity
- Check constraints validate enum values
- Unique constraints prevent duplicates

## Assumptions & Limitations

### Assumptions
1. Single-user mode - no multi-user support
2. All data is accessible without authentication
3. File uploads stored locally (not in cloud storage)
4. No real-time updates - data refreshed on page load
5. Date/time in UTC stored, displayed in local timezone

### Limitations
1. No file upload implementation (stubbed)
2. No image handling for analysis symbols
3. No advanced filtering/search
4. No pagination (loads all records)
5. No data export functionality
6. No print/PDF generation
7. No email notifications
8. No mobile app

## Security Considerations

### Current Implementation
- No authentication required
- No input sanitization (relies on database)
- No rate limiting
- CORS configured per environment

### Production Recommendations
1. Add input validation and sanitization
2. Implement rate limiting
3. Add request logging
4. Use parameterized queries (already implemented)
5. Add API key authentication for admin endpoints
6. Implement file upload size limits
7. Add CSRF protection

## Testing Strategy

### Unit Tests (To Be Implemented)
- API route handlers
- Database queries
- Business logic functions
- React components

### Integration Tests (To Be Implemented)
- API endpoint testing
- Database operations
- Frontend API integration

### Manual Testing Checklist
- [x] Create trade
- [x] View trade list
- [x] View dashboard stats
- [x] Create account
- [x] Create strategy
- [x] Create tag
- [x] View insights
- [x] Update settings
- [ ] File upload (stubbed)
- [ ] Delete operations
- [ ] Error scenarios

## Future Enhancements

1. File upload with Supabase Storage
2. Advanced filtering and search
3. Data export (CSV/PDF)
4. Chart visualizations
5. Trade review workflow
6. Strategy performance tracking
7. Tag-based filtering
8. Date range filtering on all pages
9. Pagination for large datasets
10. Real-time updates via WebSockets

## Edge Cases Handled

1. **Empty States:** All pages handle no data gracefully
2. **Missing Relationships:** Optional foreign keys handled with nulls
3. **Date Filtering:** Handles missing date parameters
4. **Division by Zero:** Win rate and R:R calculations handle zero cases
5. **Invalid Data:** Database constraints prevent invalid data
6. **Concurrent Updates:** Last write wins (no optimistic locking)

## Performance Considerations

1. Database indexes on frequently queried fields
2. Efficient JOIN queries for related data
3. Client-side caching (future: React Query)
4. Lazy loading of components (future)
5. Pagination for large datasets (future)

## Conclusion

This implementation provides a functional foundation for Trading Journal with all core business logic intact. The exclusion of authentication and daily journal features simplifies the implementation while maintaining the essential trading journal functionality. The codebase is structured for easy extension and can be enhanced with the excluded features or additional functionality as needed.

