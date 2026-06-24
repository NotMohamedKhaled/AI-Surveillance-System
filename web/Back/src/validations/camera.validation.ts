// validations/camera.validation.ts
import { z } from "zod";
import { CameraStatus } from "../models/camera.model";

export const createCameraSchema = z.object({
  body: z.object({
    cameraAiId: z.string().min(3).max(50).regex(/^[A-Z0-9_\-]+$/, "cameraId must contain only uppercase letters, numbers, _ and -"),
    name: z
      .string("Camera name is required")
      .min(2, "Camera name must be at least 2 characters"),
    ip: z
      .string("IP address is required")
      .regex(
        /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
        "Invalid IP address"
      ),
    rtspUrl: z
      .url("A Valid RTSP URL is required"),
    status: z.enum(CameraStatus).optional(),

    location: z
      .string("Location is required")
      .min(2, "Location must be at least 2 characters"),
    isEnabled: z
      .boolean()
      .optional()
      .default(true),
  }),
});
export const getCameraByAiIdSchema = z.object({
  params: z.object({
    cameraAiId: z
      .string()
      .min(3, "cameraAiId must be at least 3 characters")
      .max(50, "cameraAiId cannot exceed 50 characters")
      .regex(/^[A-Z0-9_\-]+$/, "cameraAiId must contain only uppercase letters, numbers, _ and -"),
  }),
});

export const getCameraById = z.object({
      params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid camera id"),
      }),
})

export const updateCameraByIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid camera id"),
      }),
  body: z
    .object({
      cameraAiId: z.string().min(3).max(50).regex(/^[A-Z0-9_\-]+$/, "cameraId must contain only uppercase letters, numbers, _ and -").optional(),
      name: z.string().min(2).optional(),
      location: z.string().min(2).optional(),
      rtspUrl: z.string("Must be a valid URL").optional(),
      isEnabled: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});


export const toggleCameraSchema = z.object({
   params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid camera id"),
      }),
  body: z
    .object({
      isEnabled: z.boolean(),
    })
});
