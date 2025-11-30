"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const prisma_2 = require("../generated/prisma");
class AuthMiddleware {
    async isAuthenticated(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    error: "Unauthorized. Missing or invalid Authorization header",
                });
            }
            const token = authHeader.split(" ")[1];
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            }
            catch (err) {
                if (err.name === "TokenExpiredError") {
                    return res.status(401).json({
                        error: "Access token expired. Please refresh your token",
                    });
                }
                return res.status(401).json({ error: "Invalid access token" });
            }
            // Fetch user
            const user = await prisma_1.default.user.findUnique({
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
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "Authentication failed" });
        }
    }
    restrictTo(...allowedRoles) {
        return (req, res, next) => {
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
    isAdmin(req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (req.user.role !== prisma_2.UserRole.ADMIN &&
            req.user.role !== prisma_2.UserRole.SUPERADMIN) {
            return res.status(403).json({
                error: "Access denied. Admin role required",
            });
        }
        next();
    }
    isSuperAdmin(req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (req.user.role !== prisma_2.UserRole.SUPERADMIN) {
            return res.status(403).json({
                error: "Access denied. SUPER_ADMIN required",
            });
        }
        next();
    }
}
exports.default = new AuthMiddleware();
//# sourceMappingURL=auth.middleware.js.map