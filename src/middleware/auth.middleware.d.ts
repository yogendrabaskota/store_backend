import { NextFunction, Request, Response } from "express";
import { UserRole } from "../generated/prisma";
export interface AuthRequest extends Request {
    userId?: string;
    user?: {
        id: string;
        email: string;
        name: string;
        password: string;
        role: UserRole;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    };
}
declare class AuthMiddleware {
    isAuthenticated(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    restrictTo(...allowedRoles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    isAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
    isSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
}
declare const _default: AuthMiddleware;
export default _default;
//# sourceMappingURL=auth.middleware.d.ts.map