import { z } from "zod";

export const createIncidentSchema = z.object({
  body: z.object({
    alertId: z.string().min(1, "Alert ID is required"),
    cameraId: z.string().min(1, "Camera ID is required"),
    frameImageUrl: z.string().min(1, "Frame image is required"),
    handledBy: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid user id")
      .optional(),
  }),
});


export const updateIncidentSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Incident ID is required"),
  }),
  body: z.object({
    status: z.enum(["open", "in_progress", "closed"]).optional(),
    responseNotes: z.string().optional(),
    handledBy: z.string().optional(),
    resolvedAt: z.coerce.date().optional(),
  }),
});


export const getIncidentByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Incident ID is required"),
  }),
});



export const getIncidentByAlertIdSchema = z.object({
  params: z.object({
    alertId: z.string().min(1, "Incident ID is required"),
  }),
});



export const getIncidentByCameraIdSchema = z.object({
  params: z.object({
    cameraId: z.string().min(1, "Incident ID is required"),
  }),
});



