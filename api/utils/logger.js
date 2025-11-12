// Logging utility using Winston
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Console format (always use this for Render/cloud platforms)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Define log format for files
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger with console transport first (critical for Render)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: consoleFormat,
  defaultMeta: { service: "trading-journal-api" },
  transports: [
    // Always add console transport (required for Render logs)
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Try to add file transports (optional, graceful failure)
try {
  const logsDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Add file transports only if directory creation succeeded
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
} catch (error) {
  // File logging failed (e.g., no write permissions on Render)
  // Continue with console logging only
  console.warn("File logging unavailable, using console only:", error.message);
}

export default logger;

// Helper functions
export const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.userId || "anonymous",
    });
  });
  
  next();
};

export const logError = (error, req) => {
  logger.error("Error occurred", {
    error: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    method: req?.method,
    url: req?.originalUrl,
    userId: req?.userId || "anonymous",
  });
};


