import dotenv from 'dotenv'

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN:process.env.JWT_EXPIRES_IN!,
  SUPER_ADMIN_PASSWORD:process.env.SUPER_ADMIN_PASSWORD!,
  SUPER_ADMIN_EMAIL:process.env.SUPER_ADMIN_EMAIL!,
  /** Set to "true" once if the seeded super admin password was double-hashed (login always 401) or you need to recover access. */
  FORCE_RESET_SUPER_ADMIN_PASSWORD: process.env.FORCE_RESET_SUPER_ADMIN_PASSWORD === "true",
  AI_API_KEY: process.env.AI_API_KEY || "defaultkey",
  CAMERA_HEARTBEAT_TIMEOUT_MS: Number(process.env.CAMERA_HEARTBEAT_TIMEOUT_MS) || 30000,
  CAMERA_HEARTBEAT_WATCHER_INTERVAL_MS: Number(process.env.CAMERA_HEARTBEAT_WATCHER_INTERVAL_MS) || 10000,
  /** Max requests per IP per window (global middleware). Override when dev tooling hits 429. */
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 500,
};