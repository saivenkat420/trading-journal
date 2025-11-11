// Request validation middleware using Joi
import Joi from "joi";
import { AppError } from "./errors.js";

// Validation middleware factory
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(
        new AppError("VALIDATION_ERROR", "Validation failed", 400, errors)
      );
    }

    // Replace request data with validated and sanitized data
    if (source === "query") {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
}

const jsonArrayField = Joi.alternatives().try(
  Joi.array().items(Joi.any()),
  Joi.string()
);

// Common validation schemas
export const schemas = {
  // Authentication schemas
  auth: {
    register: Joi.object({
      email: Joi.string().email().required().max(255),
      password: Joi.string().min(8).required().max(255),
      username: Joi.string().min(3).max(100).optional(),
      first_name: Joi.string().max(100).optional(),
      last_name: Joi.string().max(100).optional(),
    }),
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  },

  uuid: Joi.string().uuid().required(),
  uuidOptional: Joi.string().uuid().optional(),

  trade: {
    create: Joi.object({
      symbol: Joi.string().required().max(50),
      asset_class: Joi.string()
        .valid("futures", "forex", "stocks", "crypto", "commodity")
        .default("futures"),
      trade_type: Joi.string().valid("long", "short").required(),
      position_size: Joi.number().positive().required(),
      entry_price: Joi.number().positive().optional(),
      exit_price: Joi.number().positive().optional(),
      stop_loss: Joi.number().positive().optional(),
      take_profit: Joi.number().positive().optional(),
      date: Joi.date().required(),
      strategy_id: Joi.string().uuid().optional(),
      notes: Joi.string().optional().allow(""),
      reflection: Joi.string().optional().allow(""),
      tag_ids: Joi.array().items(Joi.string().uuid()).default([]),
      account_pnls: Joi.object()
        .pattern(Joi.string().uuid(), Joi.number())
        .default({}),
      session: Joi.string()
        .valid("asia", "london", "newyork", "newyork_pm")
        .required(),
      confidence_level: Joi.string().valid("good", "average", "bad").required(),
      status: Joi.string()
        .valid("open", "closed", "reviewed")
        .default("closed"),
      // P/L calculation fields - handle string-to-number conversion from FormData
      fees: Joi.alternatives()
        .try(
          Joi.number().min(0),
          Joi.string().custom((value, helpers) => {
            if (value === "" || value === null || value === undefined)
              return undefined;
            const num = Number(value);
            if (isNaN(num)) return helpers.error("number.base");
            return num >= 0 ? num : helpers.error("number.min");
          })
        )
        .optional(),
      contract_size: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string().custom((value, helpers) => {
            if (value === "" || value === null || value === undefined)
              return undefined;
            const num = Number(value);
            if (isNaN(num)) return helpers.error("number.base");
            return num > 0 ? num : helpers.error("number.positive");
          })
        )
        .optional(),
      point_value: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string().custom((value, helpers) => {
            if (value === "" || value === null || value === undefined)
              return undefined;
            const num = Number(value);
            if (isNaN(num)) return helpers.error("number.base");
            return num > 0 ? num : helpers.error("number.positive");
          })
        )
        .optional(),
      unit_size: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string().custom((value, helpers) => {
            if (value === "" || value === null || value === undefined)
              return undefined;
            const num = Number(value);
            if (isNaN(num)) return helpers.error("number.base");
            return num > 0 ? num : helpers.error("number.positive");
          })
        )
        .optional(),
    }),

    update: Joi.object({
      symbol: Joi.string().max(50).optional(),
      entry_price: Joi.number().positive().optional(),
      exit_price: Joi.number().positive().optional(),
      session: Joi.string()
        .valid("asia", "london", "newyork", "newyork_pm")
        .optional(),
      confidence_level: Joi.string().valid("good", "average", "bad").optional(),
      notes: Joi.string().optional().allow(""),
      reflection: Joi.string().optional().allow(""),
      status: Joi.string().valid("open", "closed", "reviewed").optional(),
      account_pnls: Joi.object()
        .pattern(Joi.string().uuid(), Joi.number())
        .optional(),
      tag_ids: Joi.array().items(Joi.string().uuid()).optional(),
      // P/L calculation fields - convert strings to numbers, handle empty strings
      fees: Joi.alternatives()
        .try(
          Joi.number().min(0),
          Joi.string()
            .allow("")
            .custom((value, helpers) => {
              if (value === "" || value === null || value === undefined)
                return undefined;
              const num = Number(value);
              return isNaN(num) ? helpers.error("number.base") : num;
            })
        )
        .optional(),
      contract_size: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string()
            .allow("")
            .custom((value, helpers) => {
              if (value === "" || value === null || value === undefined)
                return undefined;
              const num = Number(value);
              return isNaN(num)
                ? helpers.error("number.base")
                : num >= 0
                ? num
                : helpers.error("number.positive");
            })
        )
        .optional(),
      point_value: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string()
            .allow("")
            .custom((value, helpers) => {
              if (value === "" || value === null || value === undefined)
                return undefined;
              const num = Number(value);
              return isNaN(num)
                ? helpers.error("number.base")
                : num >= 0
                ? num
                : helpers.error("number.positive");
            })
        )
        .optional(),
      unit_size: Joi.alternatives()
        .try(
          Joi.number().positive(),
          Joi.string()
            .allow("")
            .custom((value, helpers) => {
              if (value === "" || value === null || value === undefined)
                return undefined;
              const num = Number(value);
              return isNaN(num)
                ? helpers.error("number.base")
                : num >= 0
                ? num
                : helpers.error("number.positive");
            })
        )
        .optional(),
    }),
  },

  account: {
    create: Joi.object({
      name: Joi.string().required().max(255),
      initial_balance: Joi.number().default(0),
      current_balance: Joi.number().optional(),
    }),

    update: Joi.object({
      name: Joi.string().max(255).optional(),
      current_balance: Joi.number().optional(),
    }),
  },

  strategy: {
    create: Joi.object({
      name: Joi.string().required().max(255),
      description: Joi.string().optional().allow(""),
    }),

    update: Joi.object({
      name: Joi.string().max(255).optional(),
      description: Joi.string().optional().allow(""),
    }),
  },

  tag: {
    create: Joi.object({
      name: Joi.string().required().max(100),
      color: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    }),

    update: Joi.object({
      name: Joi.string().max(100).optional(),
      color: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    }),
  },

  tradingRule: {
    create: Joi.object({
      name: Joi.string().required().max(255),
      description: Joi.string().optional().allow(""),
      rule_type: Joi.string().max(50).optional(),
      is_active: Joi.boolean().default(true),
    }),

    update: Joi.object({
      name: Joi.string().max(255).optional(),
      description: Joi.string().optional().allow(""),
      is_active: Joi.boolean().optional(),
    }),
  },

  analysis: {
    create: Joi.object({
      timeframe: Joi.string().valid("custom", "weekly", "monthly").required(),
      custom_title: Joi.string().max(255).optional(),
      start_date: Joi.date().required(),
      end_date: Joi.date().required().greater(Joi.ref("start_date")),
      major_news_events: jsonArrayField.optional(),
      symbols_analysis: jsonArrayField.optional(),
      performance_context: Joi.string().optional().allow(""),
    }),

    update: Joi.object({
      custom_title: Joi.string().max(255).optional(),
      major_news_events: jsonArrayField.optional(),
      symbols_analysis: jsonArrayField.optional(),
      performance_context: Joi.string().optional().allow(""),
    }),
  },

  goal: {
    create: Joi.object({
      month: Joi.date().required(),
      profit_goal: Joi.number().optional(),
      win_rate_goal: Joi.number().min(0).max(100).optional(),
      account_id: Joi.string().uuid().optional(),
    }),

    update: Joi.object({
      profit_goal: Joi.number().optional(),
      win_rate_goal: Joi.number().min(0).max(100).optional(),
      account_id: Joi.string().uuid().optional(),
    }),
  },

  accountTransaction: {
    create: Joi.object({
      account_id: Joi.string().uuid().required(),
      transaction_type: Joi.string()
        .valid("deposit", "withdrawal", "trade_pnl")
        .required(),
      amount: Joi.number().required(),
      description: Joi.string().optional().allow(""),
      trade_id: Joi.string().uuid().optional(),
      transaction_date: Joi.date().required(),
    }),

    update: Joi.object({
      amount: Joi.number().optional(),
      description: Joi.string().optional().allow(""),
      transaction_date: Joi.date().optional(),
    }),
  },

  settings: {
    update: Joi.object({
      value: Joi.string().required(),
    }),

    // Valid setting keys
    validKeys: ["theme", "trader_nickname", "default_account"],
  },

  // User management schemas
  users: {
    update: Joi.object({
      username: Joi.string().min(3).max(100).optional(),
      first_name: Joi.string().max(100).optional(),
      last_name: Joi.string().max(100).optional(),
    }),
    changePassword: Joi.object({
      current_password: Joi.string().required(),
      new_password: Joi.string().min(8).required().max(255),
    }),
  },

  // Query parameter schemas
  query: {
    trades: Joi.object({
      status: Joi.string().valid("open", "closed", "reviewed").optional(),
      symbol: Joi.string().max(50).optional(),
      date_from: Joi.date().optional(),
      date_to: Joi.date().optional(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0),
    }),

    analytics: Joi.object({
      date_from: Joi.date().optional(),
      date_to: Joi.date().optional(),
      account_id: Joi.string().uuid().optional(),
    }),

    goals: Joi.object({
      month: Joi.date().optional(),
      account_id: Joi.string().uuid().optional(),
    }),

    tradingRules: Joi.object({
      is_active: Joi.string().valid("true", "false").optional(),
    }),

    accountTransactions: Joi.object({
      date_from: Joi.date().optional(),
      date_to: Joi.date().optional(),
      transaction_type: Joi.string()
        .valid("deposit", "withdrawal", "trade_pnl")
        .optional(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0),
    }),

    analysis: Joi.object({
      timeframe: Joi.string().valid("custom", "weekly", "monthly").optional(),
      date_from: Joi.date().optional(),
      date_to: Joi.date().optional(),
    }),
  },
};

// Update AppError to support additional data
// This is a patch to the existing error class
const originalAppError = AppError;
export class ValidationError extends originalAppError {
  constructor(message, errors) {
    super("VALIDATION_ERROR", message, 400);
    this.errors = errors;
  }
}
