# High-Level Design (HLD) Diagram Guide
## Trading Journal Application

---

## 🎯 System Overview

**Trading Journal** is a full-stack web application for traders to log, analyze, and track their trading performance across multiple accounts.

---

## 📐 Architecture Pattern

**3-Tier Architecture:**
1. **Presentation Layer** (Frontend)
2. **Application Layer** (Backend API)
3. **Data Layer** (Database)

---

## 🏗️ Components Overview

### 1. **Frontend (React SPA)**
- **Technology**: React 18 + TypeScript + Vite
- **Deployment**: Vercel (CDN)
- **Key Features**:
  - Client-side routing
  - JWT-based authentication
  - Real-time data visualization
  - File uploads

### 2. **Backend API (Node.js/Express)**
- **Technology**: Node.js + Express.js
- **Deployment**: Render (Serverless/Container)
- **Key Features**:
  - RESTful API
  - JWT authentication
  - File storage (database)
  - Rate limiting
  - Input validation

### 3. **Database (PostgreSQL)**
- **Provider**: Neon (Serverless PostgreSQL)
- **Features**:
  - Relational data model
  - JSONB for flexible data
  - BYTEA for file storage
  - ACID transactions

---

## 📊 How to Draw the HLD Diagram

### **Step 1: Draw the Main Layers**

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                  (Frontend - React SPA)                 │
│                    Deployed on Vercel                   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST API
                          │ (JSON, FormData)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│              (Backend API - Node.js/Express)             │
│                   Deployed on Render                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ SQL Queries
                          │ (Connection Pool)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                         │
│              (PostgreSQL Database - Neon)                 │
│                  Serverless PostgreSQL                   │
└─────────────────────────────────────────────────────────┘
```

---

### **Step 2: Break Down Frontend Components**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Pages      │  │  Components  │  │   Contexts   │ │
│  │              │  │              │  │              │ │
│  │ • Dashboard  │  │ • Button     │  │ • AuthContext│ │
│  │ • TradeLog   │  │ • Card       │  │              │ │
│  │ • AddTrade   │  │ • Chart      │  │              │ │
│  │ • Analysis   │  │ • Input      │  │              │ │
│  │ • Goals      │  │ • Select     │  │              │ │
│  │ • Accounts   │  │ • ...        │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│                   ┌─────────▼─────────┐                │
│                   │   API Client      │                │
│                   │   (Axios)         │                │
│                   │                    │                │
│                   │ • Interceptors    │                │
│                   │ • Auth Headers    │                │
│                   │ • Error Handling  │                │
│                   └─────────┬─────────┘                │
│                             │                           │
└─────────────────────────────┼───────────────────────────┘
                              │
                              │ HTTP Requests
                              │
```

---

### **Step 3: Break Down Backend Components**

```
┌─────────────────────────────────────────────────────────┐
│              BACKEND API (Node.js/Express)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Middleware Layer                     │ │
│  │  • Authentication (JWT)                          │ │
│  │  • Rate Limiting                                 │ │
│  │  • Request Logging                               │ │
│  │  • Error Handling                                │ │
│  │  • Validation (Joi)                              │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Routes Layer                         │ │
│  │                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ /auth    │  │ /trades  │  │ /accounts│       │ │
│  │  │          │  │          │  │          │       │ │
│  │  │ • login  │  │ • GET    │  │ • GET    │       │ │
│  │  │ • register│ │ • POST   │  │ • POST   │       │ │
│  │  │          │  │ • PUT    │  │ • PUT    │       │ │
│  │  │          │  │ • DELETE │  │ • DELETE │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘       │ │
│  │                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ /goals   │  │ /analysis│  │ /files   │       │ │
│  │  │          │  │          │  │          │       │ │
│  │  │ • CRUD   │  │ • CRUD   │  │ • Upload │       │ │
│  │  │          │  │          │  │ • Serve  │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘       │ │
│  │                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ /strategies│/analytics│  │ /tags    │       │ │
│  │  │          │  │          │  │          │       │ │
│  │  │ • CRUD   │  │ • GET    │  │ • CRUD   │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘       │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Services Layer                       │ │
│  │  • File Upload (Multer)                         │ │
│  │  • Database Connection Pool                      │ │
│  │  • Transaction Management                        │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           │
                           │ SQL Queries
                           │
```

---

### **Step 4: Database Schema Overview**

```
┌─────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │    users     │      │   accounts   │               │
│  │              │◄──────│              │               │
│  │ • id (PK)    │      │ • id (PK)    │               │
│  │ • email      │      │ • user_id(FK)│               │
│  │ • password   │      │ • name       │               │
│  │ • ...        │      │ • balance   │               │
│  └──────────────┘      └──────────────┘               │
│         │                      │                        │
│         │                      │                        │
│         │              ┌───────▼────────┐              │
│         │              │ trade_accounts │              │
│         │              │                │              │
│         │              │ • trade_id(FK) │              │
│         │              │ • account_id(FK)│              │
│         │              │ • pnl          │              │
│         │              └───────┬────────┘              │
│         │                      │                        │
│         │              ┌───────▼────────┐              │
│         │              │    trades     │              │
│         │              │                │              │
│         │              │ • id (PK)     │              │
│         │              │ • user_id(FK) │              │
│         │              │ • symbol      │              │
│         │              │ • pnl         │              │
│         │              │ • ...         │              │
│         │              └───────┬────────┘              │
│         │                      │                        │
│         │              ┌───────▼────────┐              │
│         │              │  trade_files   │              │
│         │              │                │              │
│         │              │ • trade_id(FK) │              │
│         │              │ • file_data    │              │
│         │              │ • (BYTEA)      │              │
│         │              └─────────────────┘              │
│         │                                              │
│         │      ┌──────────────┐  ┌──────────────┐     │
│         │      │   strategies │  │    goals     │     │
│         └──────│              │  │              │     │
│                │ • id (PK)    │  │ • id (PK)    │     │
│                │ • user_id(FK)│  │ • user_id(FK)│     │
│                │ • name       │  │ • account_id │     │
│                └──────────────┘  └──────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### **1. User Authentication Flow**

```
User → Frontend → POST /api/auth/login
                    │
                    ▼
              Backend API
                    │
                    ├─→ Validate Credentials
                    ├─→ Query Database (users table)
                    ├─→ Generate JWT Token
                    │
                    ▼
              Response (Token)
                    │
                    ▼
         Frontend stores token in localStorage
                    │
                    ▼
         Subsequent requests include token in header
```

### **2. Trade Creation Flow**

```
User fills form → Frontend
                    │
                    ├─→ Validate form data
                    ├─→ Create FormData (includes files)
                    │
                    ▼
         POST /api/trades (with FormData)
                    │
                    ▼
              Backend API
                    │
                    ├─→ Authenticate (JWT)
                    ├─→ Validate (Joi)
                    ├─→ Parse FormData
                    │
                    ▼
         Database Transaction
                    │
                    ├─→ INSERT trade
                    ├─→ INSERT trade_accounts (if accounts selected)
                    ├─→ UPDATE accounts (balance)
                    ├─→ INSERT trade_files (BYTEA)
                    │
                    ▼
         Commit Transaction
                    │
                    ▼
         Response (Created Trade)
                    │
                    ▼
         Frontend redirects to Trade Log
```

### **3. File Upload Flow**

```
User selects files → Frontend
                    │
                    ├─→ Create preview (images)
                    ├─→ Add to FormData
                    │
                    ▼
         POST /api/trades (multipart/form-data)
                    │
                    ▼
              Backend API
                    │
                    ├─→ Multer middleware
                    ├─→ Validate file type/size
                    ├─→ Convert to Buffer
                    │
                    ▼
         Database INSERT
                    │
                    ├─→ Store as BYTEA
                    ├─→ Store metadata
                    │
                    ▼
         Response
                    │
                    ▼
         Frontend displays success
```

---

## 🎨 Complete HLD Diagram (Text Representation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│                    (Chrome/Firefox/Safari)                          │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                    FRONTEND (React SPA)                            │
│                    Deployed: Vercel CDN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Pages     │  │ Components  │  │  Contexts   │               │
│  │             │  │             │  │             │               │
│  │ Dashboard   │  │ Button      │  │ AuthContext │               │
│  │ TradeLog    │  │ Card        │  │             │               │
│  │ AddTrade    │  │ Chart       │  │             │               │
│  │ Analysis    │  │ Input       │  │             │               │
│  │ Goals       │  │ Select      │  │             │               │
│  │ Accounts    │  │ ...         │  │             │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│         │                 │                 │                      │
│         └─────────────────┼─────────────────┘                      │
│                           │                                        │
│                  ┌────────▼────────┐                              │
│                  │   API Client    │                              │
│                  │   (Axios)       │                              │
│                  │                 │                              │
│                  │ • Base URL     │                              │
│                  │ • Interceptors │                              │
│                  │ • Auth Headers │                              │
│                  └────────┬────────┘                              │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            │ REST API (HTTPS)
                            │ JSON / FormData
                            │
┌───────────────────────────▼────────────────────────────────────────┐
│                  BACKEND API (Node.js/Express)                      │
│                    Deployed: Render                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Middleware Stack                          │ │
│  │                                                               │ │
│  │  CORS → Rate Limiter → Logger → Auth (JWT) → Validation     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                            │                                        │
│  ┌────────────────────────▼────────────────────────────────────┐ │
│  │                    Route Handlers                           │ │
│  │                                                              │ │
│  │  /api/auth      /api/trades     /api/accounts               │ │
│  │  /api/goals     /api/analysis   /api/files                  │ │
│  │  /api/strategies /api/analytics /api/tags                   │ │
│  └────────────────────────┬────────────────────────────────────┘ │
│                           │                                       │
│  ┌────────────────────────▼────────────────────────────────────┐ │
│  │                    Services Layer                           │ │
│  │                                                              │ │
│  │  • File Upload (Multer)                                     │ │
│  │  • Database Pool Manager                                    │ │
│  │  • Transaction Manager                                       │ │
│  └────────────────────────┬────────────────────────────────────┘ │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            │ SQL (pg library)
                            │ Connection Pool
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                              │
│                    Provider: Neon                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  users   │  │ accounts │  │  trades  │  │ strategies│         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  goals   │  │ analysis │  │trade_files│ │trade_tags│          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐                                       │
│  │trade_accounts│account_transactions│                            │
│  └──────────┘  └──────────┘                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Design Decisions

### **1. Why 3-Tier Architecture?**
- **Separation of Concerns**: Each layer has a specific responsibility
- **Scalability**: Can scale each layer independently
- **Maintainability**: Changes in one layer don't affect others
- **Security**: Database is not directly exposed

### **2. Why React SPA?**
- **Fast Navigation**: No page reloads
- **Better UX**: Smooth transitions
- **Reusable Components**: DRY principle
- **State Management**: Centralized auth state

### **3. Why RESTful API?**
- **Stateless**: Easy to scale horizontally
- **Standard**: Well-understood pattern
- **Cacheable**: Can leverage HTTP caching
- **Flexible**: Can add new endpoints easily

### **4. Why PostgreSQL?**
- **ACID Compliance**: Data integrity
- **JSONB Support**: Flexible schema for analysis data
- **BYTEA**: Store files directly in database
- **Relationships**: Proper foreign keys and constraints

### **5. Why JWT Authentication?**
- **Stateless**: No server-side session storage
- **Scalable**: Works across multiple servers
- **Secure**: Signed tokens prevent tampering
- **Standard**: Industry-standard approach

### **6. Why Store Files in Database?**
- **Simplicity**: No separate file storage service
- **Consistency**: All data in one place
- **Backup**: Included in database backups
- **Security**: Database-level access control

---

## 📝 Interview Talking Points

### **When Drawing the Diagram:**

1. **Start with User**: "The user interacts with the browser..."

2. **Frontend Layer**: "The frontend is a React SPA deployed on Vercel for global CDN distribution..."

3. **API Communication**: "The frontend communicates with the backend via REST API using HTTPS..."

4. **Backend Layer**: "The backend is a Node.js/Express API with middleware for auth, validation, and rate limiting..."

5. **Database Layer**: "Data is stored in PostgreSQL using Neon's serverless platform..."

6. **Key Features**: Mention:
   - JWT authentication
   - File uploads stored as BYTEA
   - Transaction management for data consistency
   - Rate limiting for security
   - Input validation for data integrity

### **Common Follow-up Questions:**

**Q: Why not use MongoDB?**
- **A**: "PostgreSQL provides ACID guarantees which are crucial for financial data. Also, we need complex joins for analytics queries, which PostgreSQL handles better."

**Q: Why store files in database?**
- **A**: "For simplicity and consistency. All user data is in one place, making backups easier. For larger scale, we could migrate to S3, but for MVP this works well."

**Q: How do you handle scalability?**
- **A**: "The stateless API design allows horizontal scaling. We use connection pooling for database efficiency. Frontend is on CDN for global distribution."

**Q: How do you ensure data security?**
- **A**: "JWT tokens for authentication, HTTPS for transport, input validation to prevent injection, rate limiting to prevent abuse, and database-level constraints for data integrity."

---

## 🎯 Quick Reference: Components

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + TypeScript | User interface |
| API Client | Axios | HTTP requests |
| Backend | Node.js + Express | Business logic |
| Auth | JWT | Authentication |
| Validation | Joi | Input validation |
| Database | PostgreSQL | Data storage |
| File Storage | BYTEA | Binary data |
| Deployment | Vercel + Render | Hosting |

---

## 📐 Drawing Tips

1. **Use Boxes**: Each component in a box
2. **Use Arrows**: Show data flow direction
3. **Label Connections**: "HTTPS", "SQL", "REST API"
4. **Group Related**: Group frontend components together
5. **Show Layers**: Clearly separate 3 tiers
6. **Add Details**: Include key technologies
7. **Show Data Flow**: User → Frontend → Backend → Database

---

## 🎨 Visual Tools You Can Use

- **Draw.io** (diagrams.net) - Free, web-based
- **Lucidchart** - Professional diagrams
- **Miro** - Collaborative whiteboard
- **Excalidraw** - Hand-drawn style
- **Whiteboard** - For in-person interviews

---

## ✅ Checklist for Interview

- [ ] Draw 3 main layers (Frontend, Backend, Database)
- [ ] Show key frontend components
- [ ] Show API routes/endpoints
- [ ] Show database tables
- [ ] Show data flow (arrows)
- [ ] Mention deployment platforms
- [ ] Explain authentication flow
- [ ] Explain file upload flow
- [ ] Mention key technologies
- [ ] Be ready for scalability questions

---

Good luck with your interview! 🚀

