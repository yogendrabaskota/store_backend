import { email, z } from "zod";

export const registerUserSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),

    email: z.string().email({ message: "Invalid email format" }),

    password: z
      .string()
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[\W_]/, "Password must contain at least one special character")
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be less than 100 characters"),

    phone: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 10, {
        message: "Phone number must be at least 10 digits",
      }),
  })
  .refine((data) => data.name && data.name.trim().length > 0, {
    message: "Name is required",
    path: ["name"],
  })
  .refine((data) => data.email && data.email.trim().length > 0, {
    message: "Email is required",
    path: ["email"],
  })
  .refine((data) => data.password && data.password.trim().length > 0, {
    message: "Password is required",
    path: ["password"],
  });

export const loginUserSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;