// Authentication middleware
import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";

// Verify JWT token
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    } else if (req.query?.token) {
      token = Array.isArray(req.query.token)
        ? req.query.token[0]
        : req.query.token;
      // Remove token from query so downstream validators don't complain
      delete req.query.token;
    }

    if (!token) {
      // For development, allow x-user-id header as fallback
      if (process.env.NODE_ENV === "development" && req.headers["x-user-id"]) {
        req.userId = req.headers["x-user-id"];
        req.user = { id: req.userId };
        return next();
      }

      throw new AppError("UNAUTHORIZED", "No token provided", 401);
    }

    try {
      // Verify the JWT token
      const decoded = verifyToken(token);

      req.userId = decoded.id;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
      };

      return next();
    } catch (jwtError) {
      // If JWT verification fails, check if it's a simple token (development only)
      if (process.env.NODE_ENV === "development") {
        req.userId = token;
        req.user = { id: token };
        return next();
      }
      throw new AppError("UNAUTHORIZED", "Invalid or expired token", 401);
    }
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
      try {
        const decoded = verifyToken(token);
        req.userId = decoded.id;
        req.user = {
          id: decoded.id,
          email: decoded.email,
          username: decoded.username,
        };
      } catch (error) {
        // Token invalid, but don't fail
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
