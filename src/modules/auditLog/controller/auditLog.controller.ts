import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { Prisma } from "../../../generated/prisma";
import prisma from "../../../config/prisma";
import { createAuditLog, sendResponse } from "../../../globals/helper";

export class AuditLogController {
  async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
        action,
        resource,
        resourceId,
        userId,
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.AuditLogWhereInput = {};

      if (action)
        where.action = { contains: action as string, mode: "insensitive" };
      if (resource) where.resource = resource as string;
      if (resourceId) where.resourceId = resourceId as string;
      if (userId) where.userId = userId as string;

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Search across multiple fields
      if (search) {
        where.OR = [
          { action: { contains: search as string, mode: "insensitive" } },
          { description: { contains: search as string, mode: "insensitive" } },
          { resource: { contains: search as string, mode: "insensitive" } },
        ];
      }

      // Execute parallel queries
      const [logs, totalCount, summary] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
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
        prisma.auditLog.count({ where }),
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

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "AUDIT_LOGS_VIEW",
          description: "Viewed audit logs with filters",
          resource: "AuditLog",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Audit logs retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get audit logs error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private async getAuditSummary(where: Prisma.AuditLogWhereInput) {
    const [actionSummary, resourceSummary, recentActivity] = await Promise.all([
      // Action type summary
      prisma.auditLog.groupBy({
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
      prisma.auditLog.groupBy({
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
      prisma.auditLog.groupBy({
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
    const recentActivityWithUsers = await Promise.all(
      recentActivity.map(async (activity) => {
        const user = await prisma.user.findUnique({
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
      })
    );

    return {
      totalActions: actionSummary.reduce(
        (acc, curr) => acc + curr._count.id,
        0
      ),
      byAction: actionSummary,
      byResource: resourceSummary,
      recentUsers: recentActivityWithUsers,
    };
  }

  async getAuditLogById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return sendResponse(res, 400, "Audit log ID is required");
      }

      const log = await prisma.auditLog.findUnique({
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
        return sendResponse(res, 404, "Audit log not found");
      }

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "AUDIT_LOG_DETAIL_VIEW",
          description: `Viewed audit log details for action: ${log.action}`,
          resource: "AuditLog",
          resourceId: id,
        },
        req
      );

      return sendResponse(res, 200, "Audit log retrieved successfully", log);
    } catch (error) {
      console.error("Get audit log by ID error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getUserActivity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      if (!userId) {
        return sendResponse(res, 400, "User ID is required");
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return sendResponse(res, 404, "User not found");
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.AuditLogWhereInput = {
        userId,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [activities, totalCount, activitySummary] = await Promise.all([
        prisma.auditLog.findMany({
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
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
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

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "USER_ACTIVITY_VIEW",
          description: `Viewed activity timeline for user: ${user.name}`,
          resource: "User",
          resourceId: userId,
        },
        req
      );

      return sendResponse(
        res,
        200,
        "User activity retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get user activity error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new AuditLogController();
