import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
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

interface JWTPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

class AuthMiddleware {
  async isAuthenticated(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Unauthorized. Missing or invalid Authorization header",
        });
      }

      const token = authHeader.split(" ")[1];

      let decoded: JWTPayload;

      try {
        decoded = jwt.verify(
          token as string,
          process.env.JWT_SECRET!
        ) as unknown as JWTPayload;
      } catch (err: any) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            error: "Access token expired. Please refresh your token",
          });
        }
        return res.status(401).json({ error: "Invalid access token" });
      }

      // Fetch user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "User account is inactive" });
      }

      req.userId = user.id;
      req.user = user;

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Authentication failed" });
    }
  }

  restrictTo(...allowedRoles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized. User not found" });
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        });
      }

      next();
    };
  }

  isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.SUPERADMIN
    ) {
      return res.status(403).json({
        error: "Access denied. Admin role required",
      });
    }

    next();
  }

  isSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({
        error: "Access denied. SUPER_ADMIN required",
      });
    }

    next();
  }
}

export default new AuthMiddleware();
