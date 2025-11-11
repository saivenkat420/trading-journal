# Trading Journal - Step-by-Step Deployment Guide
## Vercel (Frontend) + Railway (Backend)

This guide provides detailed step-by-step instructions for deploying Trading Journal using Vercel for the frontend and Railway for the backend.

---

## Prerequisites

Before starting, ensure you have:
- ✅ GitHub account
- ✅ Code pushed to a GitHub repository
- ✅ Railway account (sign up at [railway.app](https://railway.app))
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))

---

## Part 1: Backend Deployment on Railway

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub (recommended) or email
4. Authorize Railway to access your GitHub repositories

### Step 2: Create New Project

1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Choose your `trading-journal` repository
4. Railway will ask: **"Configure a service"**
   - Select **"Empty Service"** (we'll configure it manually)

### Step 3: Configure Backend Service

1. In your new project, click **"New"** → **"GitHub Repo"**
2. Select your repository again
3. Railway will detect it's a Node.js project
4. **Important**: Click on the service, then go to **Settings** tab
5. Set **Root Directory** to: `api`
6. Set **Start Command** to: `node server.js`

### Step 4: Add PostgreSQL Database

1. In your Railway project, click **"New"** button
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL database
   - Generate a `DATABASE_URL` environment variable
   - Link it to your backend service

### Step 5: Set Environment Variables

1. Click on your **backend service** (not the database)
2. Go to **Variables** tab
3. Click **"New Variable"** and add the following:

#### Required Variables:

```bash
# Database (Railway auto-creates this, but verify it exists)
DATABASE_URL=${{Postgres.DATABASE_URL}}
# OR manually set if needed:
# DATABASE_URL=postgresql://postgres:password@host:5432/railway

# Server Configuration
NODE_ENV=production
PORT=3000

# CORS (Update with your Vercel URL after frontend deployment)
CORS_ORIGIN=https://your-app.vercel.app
# For now, you can use: CORS_ORIGIN=*

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this

# File Storage
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads

# Logging
LOG_LEVEL=info
```

**How to generate JWT_SECRET:**
```bash
# On your local machine, run:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Click **"Add"** for each variable
5. **Save** the variables

### Step 6: Run Database Migration

1. In Railway, click on your **backend service**
2. Go to **Deployments** tab
3. Click on the latest deployment
4. Click **"View Logs"** to see the deployment process
5. Once deployed, click on your service → **Settings** → **Generate Domain**
6. Copy the generated domain (e.g., `your-api.up.railway.app`)

7. **Run Migration via Railway CLI** (Recommended):
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Link to your project
   railway link
   
   # Run migration
   cd api
   railway run npm run migrate
   ```

   **OR Run Migration Manually:**
   - Go to your PostgreSQL database in Railway
   - Click **"Query"** tab
   - Copy the entire contents of `db/schema.sql`
   - Paste and execute in the SQL editor

### Step 7: Verify Backend Deployment

1. Your backend should be accessible at: `https://your-api.up.railway.app`
2. Test the health endpoint:
   ```bash
   curl https://your-api.up.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "message": "Trading Journal API is running"
   }
   ```

3. **Note your backend URL** - you'll need it for the frontend!

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended)
4. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find and select your `trading-journal` repository
3. Click **"Import"**

### Step 3: Configure Project Settings

Vercel will show configuration options. Configure as follows:

#### Framework Preset
- Select: **"Vite"** (or it may auto-detect)

#### Root Directory
- Click **"Edit"** next to Root Directory
- Set to: `frontend`
- Click **"Continue"**

#### Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (should auto-fill)
- **Output Directory**: `dist` (should auto-fill)
- **Install Command**: `npm install` (should auto-fill)

### Step 4: Set Environment Variables

1. Before deploying, click **"Environment Variables"** section
2. Click **"Add"** and add:

```bash
# API URL (Use your Railway backend URL)
VITE_API_URL=https://your-api.up.railway.app/api
```

**Important**: Replace `your-api.up.railway.app` with your actual Railway backend URL from Part 1, Step 7.

3. Click **"Save"**

### Step 5: Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Install dependencies
   - Build your project
   - Deploy to a URL like: `your-app.vercel.app`
3. Wait for deployment to complete (usually 1-2 minutes)

### Step 6: Update Backend CORS

1. Go back to **Railway** → Your backend service
2. Go to **Variables** tab
3. Update `CORS_ORIGIN` to your Vercel URL:
   ```bash
   CORS_ORIGIN=https://your-app.vercel.app
   ```
   Or if you have a custom domain:
   ```bash
   CORS_ORIGIN=https://yourdomain.com
   ```

4. Railway will automatically redeploy with the new variable

### Step 7: Verify Frontend Deployment

1. Open your Vercel deployment URL: `https://your-app.vercel.app`
2. Open browser DevTools (F12) → **Console** tab
3. Check for any errors
4. Try logging in or registering
5. Check **Network** tab to verify API calls are going to your Railway backend

---

## Part 3: Database Setup (If Not Done)

### Option A: Using Railway SQL Editor

1. In Railway, click on your **PostgreSQL** database
2. Click **"Query"** tab
3. Open `db/schema.sql` from your local project
4. Copy the entire file contents
5. Paste into Railway SQL editor
6. Click **"Run"** or execute the query
7. Verify tables are created

### Option B: Using Railway CLI

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Connect to database and run schema
cd api
railway run psql $DATABASE_URL -f ../db/schema.sql
```

### Option C: Using psql Locally

1. In Railway, go to your PostgreSQL database
2. Click **"Connect"** tab
3. Copy the connection string
4. On your local machine:
   ```bash
   psql "postgresql://postgres:password@host:port/railway" -f db/schema.sql
   ```

---

## Part 4: Custom Domain Setup (Optional)

### Vercel Custom Domain

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Domains**
3. Enter your domain name (e.g., `app.yourdomain.com`)
4. Follow Vercel's instructions to update DNS:
   - Add a CNAME record pointing to `cname.vercel-dns.com`
   - Or add A records as instructed
5. Wait for DNS propagation (can take up to 48 hours, usually minutes)
6. SSL certificate will be automatically provisioned

### Railway Custom Domain

1. In Railway, go to your backend service
2. Click **Settings** → **Generate Domain** (if not already done)
3. For custom domain:
   - Click **"Custom Domain"**
   - Enter your subdomain (e.g., `api.yourdomain.com`)
   - Update DNS:
     - Add a CNAME record pointing to your Railway domain
     - Or add A records as shown
4. Wait for DNS propagation

### Update Environment Variables

After setting up custom domains:

1. **Vercel**: Update `VITE_API_URL` to use your Railway custom domain
2. **Railway**: Update `CORS_ORIGIN` to use your Vercel custom domain

---

## Part 5: File Storage Setup

### Using Local Storage (Railway)

Railway's local filesystem is **ephemeral** - files will be lost on redeploy. For production, use Supabase Storage.

### Using Supabase Storage (Recommended)

1. **Create Supabase Project** (if not already done):
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and service role key

2. **Create Storage Bucket**:
   - Go to Storage in Supabase dashboard
   - Click **"New bucket"**
   - Name: `files`
   - Make it **Public** (or configure policies)

3. **Update Railway Environment Variables**:
   ```bash
   STORAGE_TYPE=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_STORAGE_BUCKET=files
   ```

4. **Set Storage Policies** (in Supabase SQL Editor):
   ```sql
   -- Allow authenticated uploads
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'files');
   
   -- Allow public reads
   CREATE POLICY "Allow public reads"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'files');
   ```

---

## Part 6: Post-Deployment Verification

### 1. Backend Health Check

```bash
curl https://your-api.up.railway.app/health
```

Expected:
```json
{
  "status": "ok",
  "message": "Trading Journal API is running"
}
```

### 2. Frontend Connection

1. Open your Vercel URL
2. Open DevTools → **Network** tab
3. Try to register/login
4. Verify API calls are successful (status 200)
5. Check that requests go to your Railway backend

### 3. Database Connection

1. In Railway, go to your backend service
2. Click **"View Logs"**
3. Check for any database connection errors
4. Should see: "Database connected successfully"

### 4. Test Full Flow

1. ✅ Register a new user
2. ✅ Login
3. ✅ Create a trading account
4. ✅ Add a trade
5. ✅ Upload a file (if file storage configured)
6. ✅ View dashboard
7. ✅ Check goals page

---

## Troubleshooting

### Backend Issues

**Problem**: Railway deployment fails
- Check build logs in Railway
- Verify `Root Directory` is set to `api`
- Check `Start Command` is `node server.js`
- Verify all environment variables are set

**Problem**: Database connection fails
- Verify `DATABASE_URL` exists in Railway variables
- Check database is running (Railway dashboard)
- Verify schema is applied (check tables exist)

**Problem**: CORS errors
- Verify `CORS_ORIGIN` includes your Vercel URL
- Check it's exactly: `https://your-app.vercel.app` (no trailing slash)
- Redeploy backend after changing CORS_ORIGIN

### Frontend Issues

**Problem**: API calls fail
- Verify `VITE_API_URL` is set correctly in Vercel
- Check it includes `/api` at the end: `https://your-api.up.railway.app/api`
- Rebuild after changing environment variables

**Problem**: Build fails
- Check build logs in Vercel
- Verify `Root Directory` is `frontend`
- Check for TypeScript errors
- Ensure Node.js version is 18+

**Problem**: Environment variables not working
- Vite requires `VITE_` prefix
- Rebuild after adding variables
- Check variable is set for "Production" environment

### Database Issues

**Problem**: Tables don't exist
- Run `db/schema.sql` in Railway SQL editor
- Or use Railway CLI: `railway run npm run migrate`

**Problem**: Migration errors
- Check if schema was partially applied
- Drop tables and re-run schema
- Check Railway logs for specific errors

---

## Quick Reference

### Railway Backend URL
```
https://your-api.up.railway.app
```

### Vercel Frontend URL
```
https://your-app.vercel.app
```

### Important Environment Variables

**Railway (Backend)**:
- `DATABASE_URL` (auto-created by Railway)
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-app.vercel.app`
- `JWT_SECRET=your-secret-key`

**Vercel (Frontend)**:
- `VITE_API_URL=https://your-api.up.railway.app/api`

---

## Next Steps

1. ✅ Set up monitoring (Railway provides basic monitoring)
2. ✅ Configure backups (Railway PostgreSQL has automatic backups)
3. ✅ Set up custom domains (optional but recommended)
4. ✅ Configure file storage (Supabase Storage recommended)
5. ✅ Review security settings
6. ✅ Set up error tracking (Sentry, etc.)

---

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Project Issues**: Check GitHub repository

---

**Last Updated**: January 2025

