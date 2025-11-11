# Deployment Checklist - Vercel + Railway

Use this checklist as you go through the deployment process.

## Pre-Deployment

- [ ] Code is pushed to GitHub repository
- [ ] Railway account created
- [ ] Vercel account created
- [ ] Both accounts connected to GitHub

---

## Backend Deployment (Railway)

### Setup
- [ ] Created new Railway project
- [ ] Connected GitHub repository
- [ ] Created backend service with root directory: `api`
- [ ] Added PostgreSQL database
- [ ] Set start command: `node server.js`

### Environment Variables
- [ ] `DATABASE_URL` (auto-created by Railway - verify it exists)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `CORS_ORIGIN=*` (update after frontend deployment)
- [ ] `JWT_SECRET` (generated secure random string)
- [ ] `STORAGE_TYPE=local`
- [ ] `LOCAL_STORAGE_PATH=./uploads`
- [ ] `LOG_LEVEL=info`

### Database
- [ ] Ran `db/schema.sql` in Railway SQL editor
- [ ] Verified tables are created
- [ ] Tested database connection

### Verification
- [ ] Backend URL noted: `https://________________.up.railway.app`
- [ ] Health check passes: `curl https://your-api.up.railway.app/health`
- [ ] No errors in Railway logs

---

## Frontend Deployment (Vercel)

### Setup
- [ ] Imported project from GitHub
- [ ] Set root directory to: `frontend`
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Environment Variables
- [ ] `VITE_API_URL=https://your-api.up.railway.app/api`
  - Replace `your-api.up.railway.app` with your actual Railway URL

### Deployment
- [ ] Deployed successfully
- [ ] Frontend URL noted: `https://________________.vercel.app`
- [ ] No build errors

### Backend CORS Update
- [ ] Updated Railway `CORS_ORIGIN` to Vercel URL
- [ ] Backend redeployed with new CORS setting

---

## Post-Deployment Testing

### Backend
- [ ] Health endpoint works
- [ ] API endpoints accessible
- [ ] Database queries working
- [ ] No errors in logs

### Frontend
- [ ] Site loads correctly
- [ ] API calls successful (check Network tab)
- [ ] No CORS errors
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can create trades
- [ ] File uploads work (if configured)

### Full User Flow
- [ ] Register new user
- [ ] Login
- [ ] Create trading account
- [ ] Add trade
- [ ] View trade log
- [ ] View dashboard
- [ ] Set goals
- [ ] View insights

---

## Optional: Custom Domains

### Vercel Domain
- [ ] Added custom domain in Vercel
- [ ] Updated DNS records
- [ ] SSL certificate active
- [ ] Updated `VITE_API_URL` if needed

### Railway Domain
- [ ] Added custom domain in Railway
- [ ] Updated DNS records
- [ ] SSL certificate active
- [ ] Updated `CORS_ORIGIN` in Railway

---

## Optional: File Storage (Supabase)

- [ ] Created Supabase project
- [ ] Created storage bucket: `files`
- [ ] Set storage policies
- [ ] Updated Railway variables:
  - [ ] `STORAGE_TYPE=supabase`
  - [ ] `SUPABASE_URL=...`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY=...`
  - [ ] `SUPABASE_STORAGE_BUCKET=files`
- [ ] Tested file uploads

---

## Security Checklist

- [ ] Changed default JWT_SECRET
- [ ] CORS_ORIGIN set to specific domain (not `*`)
- [ ] HTTPS enabled everywhere
- [ ] Strong database password
- [ ] Environment variables not committed to Git
- [ ] API keys secured

---

## Monitoring & Maintenance

- [ ] Set up uptime monitoring (optional)
- [ ] Configured error tracking (optional)
- [ ] Database backups verified (Railway auto-backups)
- [ ] Reviewed Railway usage/limits
- [ ] Reviewed Vercel usage/limits

---

## Notes

**Backend URL**: _________________________________

**Frontend URL**: _________________________________

**Database**: Railway PostgreSQL (auto-configured)

**File Storage**: _________________________________

**Custom Domains**: 
- Frontend: _________________________________
- Backend: _________________________________

---

## Issues Encountered

_Use this space to note any issues and their solutions:_

1. _________________________________
   Solution: _________________________________

2. _________________________________
   Solution: _________________________________

---

**Deployment Date**: _______________

**Deployed By**: _______________

