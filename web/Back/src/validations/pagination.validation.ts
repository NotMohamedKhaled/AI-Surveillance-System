import { z } from "zod";

export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),

  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),

  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
