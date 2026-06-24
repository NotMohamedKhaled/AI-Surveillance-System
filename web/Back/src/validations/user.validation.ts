import { z } from 'zod'
import { paginationSchema } from './pagination.validation';

export const getAllUsersSchema = z.object({
  query: paginationSchema
});

export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
  }),
});


const egyptPhoneRegex = /^(?:\+20|0)1[0125][0-9]{8}$/;
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Invalid email"),
    password: z.string(),
    phone: z.string().regex(egyptPhoneRegex, "Invalid Egyptian mobile number. Must start with 010, 011, 012, or 015."),

    role: z.enum(["super_admin", "admin", "security"]),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
    phone: z.string().regex(egyptPhoneRegex, "Invalid Egyptian mobile number. Must start with 010, 011, 012, or 015.").optional(),

    role: z.enum(["admin", "security"]).optional(),
    isDeleted: z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  ),
});




export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  }),
});
