# Trading Journal - Full Stack Implementation

A full-stack implementation of Trading Journal trading application, focusing on business logic and functionality without authentication, user profiles, or daily journal features.

## Project Structure

```
/
├── api/                 # Express.js API server
│   ├── routes/         # API route handlers
│   ├── utils/          # Utility functions
│   ├── db.js           # Database connection
│   └── server.js       # Main server file
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── utils/      # API client utilities
│   │   └── types/       # TypeScript types
├── db/                 # Database files
│   ├── schema.sql      # Database schema
│   └── seed.sql        # Seed data
├── openapi.yaml        # OpenAPI specification
└── README.md           # This file
```

## Features Implemented

- ✅ Trade Management (CRUD operations)
- ✅ Trading Accounts Management
- ✅ Strategies Management
- ✅ Tags System
- ✅ Trading Rules
- ✅ Market Analysis Entries
- ✅ Monthly Goals Tracking
- ✅ Dashboard with Statistics
- ✅ Insights & Analytics
- ✅ Settings (Theme, Nickname)

## Excluded Features

- ❌ Authentication/Login
- ❌ User Profiles
- ❌ Daily Journal

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or Neon database)

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb dt_journal

# Run schema
psql dt_journal < db/schema.sql

# Seed data
psql dt_journal < db/seed.sql
```

### 2. API Setup

```bash
cd api
npm install

# Set environment variables (see api/.env.example or use .env file)
# DATABASE_URL=postgresql://user:password@host:5432/database

# Start API server
npm run dev
```

The API will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## Configuration

### API Configuration

Set environment variables in `api/.env`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3000
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints

See `openapi.yaml` for complete API documentation.

Main endpoints:

- `GET /api/trades` - List all trades
- `POST /api/trades` - Create trade
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/insights` - Trading insights
- `GET /api/accounts` - List accounts
- `GET /api/strategies` - List strategies
- `GET /api/tags` - List tags
- `GET /api/trading-rules` - List trading rules
- `GET /api/analysis` - List analysis entries
- `GET /api/goals` - List goals
- `GET /api/settings` - Get settings

## Development

### Running Tests

```bash
# API tests (when implemented)
cd api
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Output will be in frontend/dist/
```

## Deployment

The application can be deployed to various platforms:

- **Frontend**: Vercel, Netlify, or any static hosting
- **API**: Railway, Render, or any Node.js hosting
- **Database**: Neon, Supabase, or any PostgreSQL provider

## License

This is a functional reproduction for educational purposes.
