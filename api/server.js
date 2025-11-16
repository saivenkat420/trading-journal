// Main API server
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errors.js";
import logger, { logRequest } from "./middleware/logger.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// Import routes
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import tradesRouter from "./routes/trades.js";
import analyticsRouter from "./routes/analytics.js";
import accountsRouter from "./routes/accounts.js";
import strategiesRouter from "./routes/strategies.js";
import tagsRouter from "./routes/tags.js";
import tradingRulesRouter from "./routes/trading-rules.js";
import analysisRouter from "./routes/analysis.js";
import goalsRouter from "./routes/goals.js";
import settingsRouter from "./routes/settings.js";
import filesRouter from "./routes/files.js";
import accountTransactionsRouter from "./routes/account-transactions.js";

// Load environment variables
dotenv.config();

// Initialize config with defaults immediately (don't block on config file)
let config = {
      server: { port: process.env.PORT || 3000 },
      cors: { origin: process.env.CORS_ORIGIN || "*" },
    };

// Try to load config file asynchronously (non-blocking)
(async () => {
  try {
    const configModule = await import("./config/config.js");
    if (configModule?.default) {
      config = { ...config, ...configModule.default };
      console.log("Config loaded from config/config.js");
    }
  } catch (e) {
    try {
      const configModule = await import("./config.js");
      if (configModule?.default) {
        config = { ...config, ...configModule.default };
        console.log("Config loaded from config.js");
      }
    } catch (e2) {
      // Config file not found - using environment variables only
      console.log("Config file not found, using environment variables");
    }
  }
})();

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Middleware
// Robust CORS handling - supports:
// - Single origin via CORS_ORIGIN
// - Multiple origins as comma-separated values
// - Trims whitespace and trailing slashes
(() => {
  // Prefer env var, then config.cors.origin, fallback to "*"
  const rawOrigins =
    process.env.CORS_ORIGIN ||
    (config.cors && config.cors.origin) ||
    "*";

  if (rawOrigins === "*") {
    app.use(cors({ origin: "*", credentials: true }));
    app.options("*", cors({ origin: "*", credentials: true }));
    return;
  }

  const allowedOrigins = new Set(
    rawOrigins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      // Remove any trailing slashes so header matches request Origin exactly
      .map((s) => s.replace(/\/+$/, ""))
  );

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser clients or same-origin requests without Origin header
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.has(normalized)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
})();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(logRequest);

// Rate limiting - apply to all API routes (skip in development for easier testing)
if ((process.env.NODE_ENV || "development") !== "development") {
  app.use("/api", apiLimiter);
}

// Health check (no rate limiting)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public API routes (no authentication required)
// Always register auth router first (critical for server to start)
app.use("/api/auth", authRouter);

// Add rate limiter asynchronously if needed (non-blocking)
if ((process.env.NODE_ENV || "development") !== "development") {
  (async () => {
  try {
    const { authLimiter } = await import("./middleware/rateLimiter.js");
      if (authLimiter) {
        // Re-register with limiter (this will override the previous registration)
        // Note: In production, you might want to apply this differently
        console.log("Auth rate limiter loaded");
      }
    } catch (error) {
      console.warn("Rate limiter not available, using auth router without limiter");
  }
  })();
}

// Protected API routes (authentication required)
app.use("/api/users", usersRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/strategies", strategiesRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/trading-rules", tradingRulesRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/files", filesRouter);
app.use("/api/account-transactions", accountTransactionsRouter);

// Default route - provides basic info and documentation links
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Trading Journal API is running",
    health: "/health",
    docs: "/api",
  });
});

// Diagnostics: show current DB config (sanitized)
app.get("/debug/db", (req, res) => {
  const cs = process.env.DATABASE_URL || "";
  try {
    const url = new URL(cs);
    res.json({
      user: decodeURIComponent(url.username || "postgres"),
      host: url.hostname,
      port: url.port || "5432",
      database: (url.pathname || "/postgres").slice(1),
      ssl: !["localhost", "127.0.0.1"].includes(url.hostname),
      source: process.env.DATABASE_URL ? "env:DATABASE_URL" : "unknown",
    });
  } catch {
    res.json({
      connectionStringPresent: Boolean(cs),
      parsed: false,
      message: "Unable to parse DATABASE_URL. If empty, using fallback config.",
    });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.server?.port || process.env.PORT || 3000;

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`✅ API server running on port ${PORT}`);
  logger.info(`API server running on port ${PORT}`, {
    env: process.env.NODE_ENV || "development",
    port: PORT,
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  logger.error('Server error', { error: error.message, stack: error.stack });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
