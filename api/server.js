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

// Import config - try config/config.js first, then config.js
let config;
try {
  config = (await import("./config/config.js")).default;
} catch (e) {
  try {
    config = (await import("./config.js")).default;
  } catch (e2) {
    logger.warn("config.js not found, using environment variables");
    config = {
      server: { port: process.env.PORT || 3000 },
      cors: { origin: process.env.CORS_ORIGIN || "*" },
    };
  }
}

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Middleware
app.use(cors(config.cors));
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
if ((process.env.NODE_ENV || "development") !== "development") {
  // In non-dev, optionally apply stricter auth limiter
  try {
    const { authLimiter } = await import("./middleware/rateLimiter.js");
    app.use("/api/auth", authLimiter, authRouter);
  } catch {
    app.use("/api/auth", authRouter);
  }
} else {
  app.use("/api/auth", authRouter);
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
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`, {
    env: process.env.NODE_ENV || "development",
    port: PORT,
  });
});

export default app;
