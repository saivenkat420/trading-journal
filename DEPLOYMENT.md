# Trading Journal - Deployment Guide

This guide covers deploying the Trading Journal application to production environments.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Environment Variables](#environment-variables)
8. [File Storage Setup](#file-storage-setup)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Trading Journal application consists of:

- **Frontend**: React + Vite + TypeScript application
- **Backend**: Express.js API server
- **Database**: PostgreSQL (can use Supabase, Neon, or self-hosted)
- **File Storage**: Local filesystem or Supabase Storage

---

## Architecture

```
┌─────────────────┐
│   Frontend      │  (Vercel/Netlify/Static Hosting)
│   (React/Vite)  │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│   Backend API   │  (Railway/Render/Heroku/VPS)
│   (Express.js)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│  DB   │ │ Files │
│(PG)   │ │Storage│
└───────┘ └───────┘
```

---

## Prerequisites

### Required

- Node.js 18+ and npm
- PostgreSQL 14+ database (or cloud provider)
- Git repository access
- Domain name (optional but recommended)

### Recommended Services

- **Database**: Supabase, Neon, Railway, or self-hosted PostgreSQL
- **Backend Hosting**: Railway, Render, Heroku, or VPS (DigitalOcean, AWS EC2)
- **Frontend Hosting**: Vercel, Netlify, or Cloudflare Pages
- **File Storage**: Supabase Storage or local filesystem (with backups)

---

## Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase Project**

   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Schema**

   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `db/schema.sql`
   - Execute the SQL script
   - Verify tables are created

3. **Get Connection String**
   - Go to Project Settings → Database
   - Copy the connection string (use the "Connection pooling" URI for better performance)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Option 2: Neon (Serverless PostgreSQL)

1. **Create Neon Project**

   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **Run Database Schema**
   - Use Neon SQL Editor or connect via psql
   - Execute `db/schema.sql`

### Option 3: Self-Hosted PostgreSQL

1. **Install PostgreSQL**

   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib

   # macOS
   brew install postgresql
   ```

2. **Create Database**

   ```bash
   sudo -u postgres psql
   CREATE DATABASE trading_journal;
   CREATE USER trading_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE trading_journal TO trading_user;
   \q
   ```

3. **Run Schema**
   ```bash
   psql -h localhost -U trading_user -d trading_journal -f db/schema.sql
   ```

---

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Connect Repository**

   - Go to [railway.app](https://railway.app)
   - Create new project
   - Connect your GitHub repository
   - Select the `api/` directory as root

2. **Add PostgreSQL Service**

   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically create a `DATABASE_URL` variable

3. **Configure Environment Variables**

   - Go to Variables tab
   - Add required variables (see [Environment Variables](#environment-variables))
   - Railway auto-detects `DATABASE_URL` from PostgreSQL service

4. **Deploy**

   - Railway auto-deploys on push to main branch
   - Or manually trigger deployment
   - Note the generated URL (e.g., `https://your-api.railway.app`)

5. **Configure Custom Domain** (Optional)
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

### Option 2: Render

1. **Create Web Service**

   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your repository
   - Select root directory: `api`

2. **Configure Service**

   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node

3. **Add PostgreSQL Database**

   - Create new PostgreSQL database
   - Render provides `DATABASE_URL` automatically

4. **Set Environment Variables**

   - Add all required variables
   - Render provides `DATABASE_URL` automatically

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

### Option 3: Heroku

1. **Install Heroku CLI**

   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create App**

   ```bash
   cd api
   heroku create your-app-name
   ```

3. **Add PostgreSQL**

   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Set Environment Variables**

   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=3000
   # Add other variables as needed
   ```

5. **Deploy**
   ```bash
   git subtree push --prefix api heroku main
   ```

### Option 4: VPS (DigitalOcean, AWS EC2, etc.)

1. **Set Up Server**

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Clone Repository**

   ```bash
   git clone https://github.com/your-username/trading-journal.git
   cd trading-journal/api
   npm install --production
   ```

3. **Set Up Environment**

   ```bash
   # Create .env file
   nano .env
   # Add all environment variables
   ```

4. **Run Database Migration**

   ```bash
   npm run migrate
   ```

5. **Start with PM2**

   ```bash
   pm2 start server.js --name trading-journal-api
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

6. **Set Up Nginx Reverse Proxy**

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Set Up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Connect Repository**

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`

2. **Configure Build Settings**

   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**

   - Go to Settings → Environment Variables
   - Add `VITE_API_URL` with your backend API URL
   - Example: `https://your-api.railway.app/api`

4. **Deploy**

   - Vercel auto-deploys on push to main
   - Or manually trigger deployment
   - Get your deployment URL

5. **Custom Domain** (Optional)
   - Go to Settings → Domains
   - Add your domain
   - Update DNS records

### Option 2: Netlify

1. **Connect Repository**

   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect repository

2. **Configure Build**

   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

3. **Set Environment Variables**

   - Go to Site settings → Environment variables
   - Add `VITE_API_URL`

4. **Deploy**
   - Netlify auto-deploys on push

### Option 3: Cloudflare Pages

1. **Connect Repository**

   - Go to Cloudflare Dashboard → Pages
   - Create new project
   - Connect repository

2. **Configure Build**

   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

3. **Set Environment Variables**

   - Add `VITE_API_URL` in build settings

4. **Deploy**
   - Cloudflare auto-deploys on push

### Option 4: Static Hosting (S3, GitHub Pages, etc.)

1. **Build Frontend**

   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Upload `dist/` folder** to your static hosting provider

3. **Configure Environment Variables**
   - Set `VITE_API_URL` at build time
   - Or use a config file that's loaded at runtime

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `api/` directory or set in your hosting platform:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database
# OR individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_journal
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=false  # Set to true for cloud databases

# Supabase (Optional - if using Supabase Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=files

# Server Configuration
PORT=3000
NODE_ENV=production
API_KEY=your-secure-api-key-here

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
# For multiple origins, use comma-separated: https://domain1.com,https://domain2.com

# File Storage
STORAGE_TYPE=local  # or 'supabase'
LOCAL_STORAGE_PATH=./uploads

# JWT Configuration (if using authentication)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info  # or 'error', 'warn', 'debug'
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory or set in your hosting platform:

```bash
# API Configuration
VITE_API_URL=https://your-api-domain.com/api

# Optional: Feature flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

**Note**: Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

---

## File Storage Setup

### Option 1: Local Filesystem (Simple)

1. **Create Uploads Directory**

   ```bash
   mkdir -p uploads
   chmod 755 uploads
   ```

2. **Configure in Backend**

   ```bash
   STORAGE_TYPE=local
   LOCAL_STORAGE_PATH=./uploads
   ```

3. **Backup Strategy**
   - Set up automated backups of the `uploads/` directory
   - Use cloud storage sync (AWS S3, Google Cloud Storage)

### Option 2: Supabase Storage (Recommended for Production)

1. **Create Storage Bucket**

   - Go to Supabase Dashboard → Storage
   - Create new bucket named `files`
   - Set as public or configure policies

2. **Configure Backend**

   ```bash
   STORAGE_TYPE=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_STORAGE_BUCKET=files
   ```

3. **Set Storage Policies** (in Supabase SQL Editor)

   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'files');

   -- Allow public read access
   CREATE POLICY "Allow public reads"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'files');
   ```

---

## Post-Deployment Verification

### 1. Backend Health Check

```bash
curl https://your-api-domain.com/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-XX..."
}
```

### 2. API Endpoint Test

```bash
curl https://your-api-domain.com/api/trades
```

Should return trades data or empty array (if authenticated).

### 3. Frontend Connection Test

1. Open your frontend URL
2. Open browser DevTools → Network tab
3. Check if API calls are successful
4. Verify `VITE_API_URL` is correctly set

### 4. Database Connection

```bash
# Test from backend server
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### 5. File Upload Test

1. Create a test trade with file upload
2. Verify file is stored correctly
3. Check file is accessible via API

---

## Monitoring & Maintenance

### 1. Logging

- Backend logs are stored in `api/logs/`
- Use a log aggregation service (Logtail, Papertrail) for production
- Monitor error logs regularly

### 2. Database Backups

**Supabase**: Automatic daily backups (check your plan)

**Self-Hosted**: Set up automated backups

```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U user trading_journal > /backups/db_$(date +\%Y\%m\%d).sql
```

### 3. Performance Monitoring

- Monitor API response times
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor database query performance

### 4. Security Checklist

- [ ] Change default API keys
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL everywhere
- [ ] Set proper CORS origins (not `*`)
- [ ] Regular dependency updates (`npm audit`)
- [ ] Set up rate limiting (already configured)
- [ ] Review file upload security

### 5. Updates & Maintenance

```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit
npm audit fix

# Database migrations
npm run migrate
```

---

## Troubleshooting

### Backend Issues

**Problem**: Database connection fails

- Check `DATABASE_URL` is correct
- Verify database is accessible from hosting provider
- Check firewall rules
- For Supabase, use connection pooling URL

**Problem**: Port already in use

- Change `PORT` environment variable
- Check if another process is using the port

**Problem**: File uploads fail

- Check `uploads/` directory permissions
- Verify storage configuration
- Check file size limits (default: 5MB)

### Frontend Issues

**Problem**: API calls fail with CORS error

- Verify `CORS_ORIGIN` includes your frontend domain
- Check backend CORS configuration
- Ensure frontend `VITE_API_URL` is correct

**Problem**: Build fails

- Check Node.js version (requires 18+)
- Clear `node_modules` and reinstall
- Check for TypeScript errors

**Problem**: Environment variables not working

- Ensure `VITE_` prefix for Vite variables
- Rebuild after changing environment variables
- Check hosting platform's env var configuration

### Database Issues

**Problem**: Schema not applied

- Run `db/schema.sql` manually
- Check database user permissions
- Verify connection string

**Problem**: Migration errors

- Check migration files in `db/migrations/`
- Run migrations in order
- Verify database state

---

## Quick Deployment Checklist

### Pre-Deployment

- [ ] Database created and schema applied
- [ ] Environment variables documented
- [ ] File storage configured
- [ ] Domain names ready (if using custom domains)

### Backend Deployment

- [ ] Repository connected to hosting platform
- [ ] Environment variables set
- [ ] Database connection tested
- [ ] Health endpoint responding
- [ ] File uploads working

### Frontend Deployment

- [ ] Repository connected to hosting platform
- [ ] `VITE_API_URL` set correctly
- [ ] Build successful
- [ ] API calls working
- [ ] CORS configured properly

### Post-Deployment

- [ ] Health checks passing
- [ ] Test user registration/login
- [ ] Test trade creation
- [ ] Test file uploads
- [ ] Monitor error logs
- [ ] Set up backups
- [ ] Configure monitoring

---

## Support & Resources

- **Documentation**: See `README.md` and `api/README.md`
- **Database Schema**: `db/schema.sql`
- **API Routes**: See `api/routes/` directory
- **Issues**: Check GitHub issues or create new one

---

## Production Recommendations

1. **Use Environment-Specific Configs**

   - Separate configs for dev/staging/production
   - Never commit `.env` files

2. **Enable HTTPS Everywhere**

   - Use SSL certificates (Let's Encrypt is free)
   - Force HTTPS redirects

3. **Set Up Monitoring**

   - Application performance monitoring (APM)
   - Error tracking (Sentry, Rollbar)
   - Uptime monitoring

4. **Regular Backups**

   - Database backups (daily)
   - File storage backups
   - Test restore procedures

5. **Security Hardening**

   - Regular security audits
   - Keep dependencies updated
   - Use strong passwords/keys
   - Enable rate limiting (already configured)

6. **Performance Optimization**
   - Enable database connection pooling
   - Use CDN for static assets
   - Implement caching where appropriate
   - Optimize database queries

---

**Last Updated**: January 2025
