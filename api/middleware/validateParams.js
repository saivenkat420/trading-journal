// Parameter validation middleware
import { AppError } from "../utils/errors.js";
import Joi from "joi";

// UUID validation schema
const uuidSchema = Joi.string().uuid().required();

// Validate UUID parameter
export function validateUUID(paramName = "id") {
  return (req, res, next) => {
    const value = req.params[paramName];

    const { error } = uuidSchema.validate(value);

    if (error) {
      return next(
        new AppError(
          "INVALID_PARAMETER",
          `Invalid ${paramName}: must be a valid UUID`,
          400
        )
      );
    }

    next();
  };
}

// Validate multiple UUID parameters
export function validateUUIDs(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      const { error } = uuidSchema.validate(value);

      if (error) {
        return next(
          new AppError(
            "INVALID_PARAMETER",
            `Invalid ${paramName}: must be a valid UUID`,
            400
          )
        );
      }
    }

    next();
  };
}

// Validate query parameters with a schema
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(
        new AppError(
          "VALIDATION_ERROR",
          "Invalid query parameters",
          400,
          errors
        )
      );
    }

    // Replace query with validated and sanitized data
    req.query = value;
    next();
  };
}
