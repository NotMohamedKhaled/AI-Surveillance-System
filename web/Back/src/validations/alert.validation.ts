import { z } from "zod";
import { AlertStatus } from "../models/alert.model";

export const createAlertSchema = z.object({
  body: z.object({
    type: z.enum(["weapon", "harassment"]),
    cameraId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid camera id"),
    frameImageUrl: z
      .string()
      .min(3, "frameImageUrl must be at least 3 characters"),
    confidence: z
      .number()
      .min(0, "confidence must be >= 0")
      .max(1, "confidence must be <= 1"),
    timestamp: z.coerce.date().optional(),
  }),
});

export const getAlertByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid alert id"),
  }),
});

export const getAllAlertsSchema = z.object({
  query: z.object({
    status: z.enum(AlertStatus).optional(),
    type: z.enum(["weapon", "harassment"]).optional(),
    cameraId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid camera id")
      .optional(),
  }).optional(),
});

export const markAlertFalseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid alert id"),
  }),
});

