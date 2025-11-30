import { z } from "zod";
export declare const registerUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        CUSTOMER: "CUSTOMER";
        ADMIN: "ADMIN";
        SUPERADMIN: "SUPERADMIN";
        STAFF: "STAFF";
    }>>>;
    password: z.ZodString;
}, z.core.$strip>;
export declare const loginUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
//# sourceMappingURL=user.validation.d.ts.map