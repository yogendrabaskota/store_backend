"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const prisma_1 = __importDefault(require("../../../config/prisma"));
const helper_1 = require("../../../globals/helper");
class AuditLogController {
    async getAuditLogs(req, res) {
        try {
            const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", action, resource, resourceId, userId, startDate, endDate, search, } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {};
            if (action)
                where.action = { contains: action, mode: "insensitive" };
            if (resource)
                where.resource = resource;
            if (resourceId)
                where.resourceId = resourceId;
            if (userId)
                where.userId = userId;
            // Date range filter
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            // Search across multiple fields
            if (search) {
                where.OR = [
                    { action: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                    { resource: { contains: search, mode: "insensitive" } },
                ];
            }
            // Execute parallel queries
            const [logs, totalCount, summary] = await Promise.all([
                prisma_1.default.auditLog.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                }),
                prisma_1.default.auditLog.count({ where }),
                this.getAuditSummary(where),
            ]);
            const totalPages = Math.ceil(totalCount / limitNum);
            const responseData = {
                logs,
                summary,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1,
                    limit: limitNum,
                },
            };
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "AUDIT_LOGS_VIEW",
                description: "Viewed audit logs with filters",
                resource: "AuditLog",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Audit logs retrieved successfully", responseData);
        }
        catch (error) {
            console.error("Get audit logs error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getAuditSummary(where) {
        const [actionSummary, resourceSummary, recentActivity] = await Promise.all([
            // Action type summary
            prisma_1.default.auditLog.groupBy({
                by: ["action"],
                where,
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: {
                        id: "desc",
                    },
                },
                take: 10,
            }),
            // Resource type summary
            prisma_1.default.auditLog.groupBy({
                by: ["resource"],
                where,
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: {
                        id: "desc",
                    },
                },
                take: 10,
            }),
            // Recent user activity
            prisma_1.default.auditLog.groupBy({
                by: ["userId"],
                where,
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: {
                        id: "desc",
                    },
                },
                take: 5,
            }),
        ]);
        // Get user details for recent activity
        const recentActivityWithUsers = await Promise.all(recentActivity.map(async (activity) => {
            const user = await prisma_1.default.user.findUnique({
                where: { id: activity.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            });
            return {
                user,
                activityCount: activity._count.id,
            };
        }));
        return {
            totalActions: actionSummary.reduce((acc, curr) => acc + curr._count.id, 0),
            byAction: actionSummary,
            byResource: resourceSummary,
            recentUsers: recentActivityWithUsers,
        };
    }
    async getAuditLogById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "Audit log ID is required");
            }
            const log = await prisma_1.default.auditLog.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });
            if (!log) {
                return (0, helper_1.sendResponse)(res, 404, "Audit log not found");
            }
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "AUDIT_LOG_DETAIL_VIEW",
                description: `Viewed audit log details for action: ${log.action}`,
                resource: "AuditLog",
                resourceId: id,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Audit log retrieved successfully", log);
        }
        catch (error) {
            console.error("Get audit log by ID error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getUserActivity(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20, startDate, endDate } = req.query;
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            // Verify user exists
            const user = await prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true },
            });
            if (!user) {
                return (0, helper_1.sendResponse)(res, 404, "User not found");
            }
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            const where = {
                userId,
            };
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            const [activities, totalCount, activitySummary] = await Promise.all([
                prisma_1.default.auditLog.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        action: true,
                        description: true,
                        resource: true,
                        resourceId: true,
                        createdAt: true,
                        ipAddress: true,
                    },
                }),
                prisma_1.default.auditLog.count({ where }),
                prisma_1.default.auditLog.groupBy({
                    by: ["action"],
                    where,
                    _count: {
                        id: true,
                    },
                    orderBy: {
                        _count: {
                            id: "desc",
                        },
                    },
                }),
            ]);
            const totalPages = Math.ceil(totalCount / limitNum);
            const responseData = {
                user,
                activities,
                summary: {
                    totalActivities: totalCount,
                    byAction: activitySummary,
                },
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1,
                    limit: limitNum,
                },
            };
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "USER_ACTIVITY_VIEW",
                description: `Viewed activity timeline for user: ${user.name}`,
                resource: "User",
                resourceId: userId,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "User activity retrieved successfully", responseData);
        }
        catch (error) {
            console.error("Get user activity error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
}
exports.AuditLogController = AuditLogController;
exports.default = new AuditLogController();
//# sourceMappingURL=auditLog.controller.js.map