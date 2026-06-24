import rateLimit from "express-rate-limit";
import { ENV } from "../configs/env";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_MAX,
  standardHeaders: true, // return rate limit info in headers
  legacyHeaders: false, // disable old headers
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});


export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
});

