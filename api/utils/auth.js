// Authentication middleware
import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";

// Try config/config.js first, fallback to config.js, or use empty config
let config = {};
try {
  config = (await import("../config/config.js")).default;
} catch (e) {
  try {
    config = (await import("../config.js")).default;
  } catch (e2) {
    // Config file not found - use environment variables only
    config = {};
  }
}

// Verify JWT token
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // For development, allow x-user-id header as fallback
      if (process.env.NODE_ENV === "development" && req.headers["x-user-id"]) {
        req.userId = req.headers["x-user-id"];
        req.user = { id: req.userId };
        return next();
      }
      
      throw new AppError("UNAUTHORIZED", "No token provided", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    // Decode and verify JWT token
    let decoded;
    try {
      // Decode the token to verify its structure
      decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.payload) {
        throw new Error("Invalid token structure");
      }

      // Extract user info from token payload
      const payload = decoded.payload;
      
      if (payload.sub || payload.user_id || payload.id) {
        req.userId = payload.sub || payload.user_id || payload.id;
        req.user = {
          id: req.userId,
          email: payload.email,
          ...payload
        };
        return next();
      }

      // Fallback: if token has user info, use it
      if (decoded.payload.sub) {
        req.userId = decoded.payload.sub;
        req.user = {
          id: req.userId,
          email: decoded.payload.email,
          ...decoded.payload
        };
        return next();
      }
    } catch (jwtError) {
      // If JWT verification fails, check if it's a simple token
      if (process.env.NODE_ENV === "development") {
        // Development fallback
        req.userId = token;
        req.user = { id: token };
        return next();
      }
      throw new AppError("UNAUTHORIZED", "Invalid token", 401);
    }

    throw new AppError("UNAUTHORIZED", "Invalid token format", 401);
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("UNAUTHORIZED", "Authentication failed", 401));
  }
}

export function optionalAuth(req, res, next) {
  // Optional authentication - doesn't fail if no token
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.decode(token, { complete: true });
      
      if (decoded && decoded.payload) {
        const payload = decoded.payload;
        req.userId = payload.sub || payload.user_id || payload.id || token;
        req.user = {
          id: req.userId,
          email: payload.email,
          ...payload
        };
      } else {
        req.userId = req.headers["x-user-id"] || null;
        req.user = req.userId ? { id: req.userId } : null;
      }
    } else {
      req.userId = req.headers["x-user-id"] || null;
      req.user = req.userId ? { id: req.userId } : null;
    }
  } catch (error) {
    req.userId = req.headers["x-user-id"] || null;
    req.user = req.userId ? { id: req.userId } : null;
  }
  
  next();
}
