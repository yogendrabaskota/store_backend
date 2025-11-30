import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import auditLogController from "../controller/auditLog.controller";

const router = express.Router();

/**
 * AUDIT LOG MANAGEMENT ROUTES
 *
 * All routes require admin access for security and compliance monitoring.
 */

router.get(
  "/audit-logs",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  auditLogController.getAuditLogs
);

router.get(
  "/audit-logs/:id",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  auditLogController.getAuditLogById
);

router.get(
  "/audit-logs/user/:userId/activity",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  auditLogController.getUserActivity
);

export default router;
