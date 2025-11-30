"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const auditLog_controller_1 = __importDefault(require("../controller/auditLog.controller"));
const router = express_1.default.Router();
/**
 * AUDIT LOG MANAGEMENT ROUTES
 *
 * All routes require admin access for security and compliance monitoring.
 */
router.get("/audit-logs", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, auditLog_controller_1.default.getAuditLogs);
router.get("/audit-logs/:id", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, auditLog_controller_1.default.getAuditLogById);
router.get("/audit-logs/user/:userId/activity", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, auditLog_controller_1.default.getUserActivity);
exports.default = router;
//# sourceMappingURL=auditLog.route.js.map