"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
const zod_1 = require("zod");
exports.registerUserSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters"),
    email: zod_1.z.string().email({ message: "Invalid email format" }),
    role: zod_1.z
        .enum(["CUSTOMER", "ADMIN", "SUPERADMIN", "STAFF"])
        .optional()
        .default("CUSTOMER"),
    // role: z.literal("CUSTOMER").optional().default("CUSTOMER"),
    password: zod_1.z
        .string()
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[\W_]/, "Password must contain at least one special character")
        .min(6, "Password must be at least 6 characters")
        .max(100, "Password must be less than 100 characters"),
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
exports.loginUserSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Invalid email format" }),
    password: zod_1.z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(100, "Password must be less than 100 characters"),
});
exports.updateProfileSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters")
        .optional(),
    email: zod_1.z.string().email({ message: "Invalid email format" }).optional(),
})
    .refine((data) => data.name || data.email, {
    message: "At least one field (name or email) must be provided for update",
    path: ["name"], // Points to name field in error
})
    .refine((data) => !data.name || (data.name && data.name.trim().length > 0), {
    message: "Name cannot be empty",
    path: ["name"],
})
    .refine((data) => !data.email || (data.email && data.email.trim().length > 0), {
    message: "Email cannot be empty",
    path: ["email"],
})
    .refine((data) => !data.name || data.name.trim().length >= 2, {
    message: "Name must be at least 2 characters",
    path: ["name"],
});
//# sourceMappingURL=user.validation.js.map