import { Request, Response } from "express";
import { AuditLogData } from "../modules/auditLog/utils/auditLog.types";
export declare function isUserExist(email: string): Promise<boolean>;
export declare function sendResponse(res: Response, statusCode: number, message: string, data?: any): Response<any, Record<string, any>>;
export declare const getUserByEmail: (email: string) => Promise<{
    name: string;
    email: string;
    role: import("../generated/prisma").$Enums.UserRole;
    password: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    createdById: string | null;
    lastLogin: Date | null;
} | null>;
export declare function createAuditLog(userId: string, data: AuditLogData, request?: Request): Promise<void>;
//# sourceMappingURL=helper.d.ts.map