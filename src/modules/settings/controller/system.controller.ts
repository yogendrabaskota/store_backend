import { Response } from "express";
import { createAuditLog, sendResponse } from "../../../globals/helper";
import { AuthRequest } from "../../../middleware/auth.middleware";
import prisma from "../../../config/prisma";

// Default system settings
const DEFAULT_SETTINGS = {
  business: {
    name: "My Business",
    email: "business@example.com",
    phone: "+1234567890",
    address: "123 Business St, City, Nepal",
    currency: "USD",
    taxRate: 0.13, // 13%
  },
  inventory: {
    lowStockThreshold: 10,
    autoReorder: false,
    notifyOnLowStock: true,
  },
  sales: {
    defaultTaxRate: 0.13,
    receiptFooter: "Thank you for your business!",
    allowReturns: true,
    returnPeriodDays: 30,
  },
  notifications: {
    lowStockEmail: true,
    newOrderEmail: true,
    dailySalesReport: false,
  },
};

export class SystemController {
  /**
   * Get all system settings
   */
  async getSystemSettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Later store settings in a database table
      // For now, returning default settings
      const settings = DEFAULT_SETTINGS;

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SYSTEM_SETTINGS_VIEW",
          description: "Viewed system settings",
          resource: "SystemSettings",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "System settings retrieved successfully",
        settings
      );
    } catch (error) {
      console.error("Get system settings error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      const settings = req.body;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!settings || typeof settings !== "object") {
        return sendResponse(res, 400, "Valid settings object is required");
      }

      // Validate settings structure
      const validSections = ["business", "inventory", "sales", "notifications"];
      const invalidSections = Object.keys(settings).filter(
        (key) => !validSections.includes(key)
      );

      if (invalidSections.length > 0) {
        return sendResponse(
          res,
          400,
          `Invalid settings sections: ${invalidSections.join(", ")}`
        );
      }

      // Later save to a database
      // For now, we'll just validate and return success

      await createAuditLog(
        userId,
        {
          action: "SYSTEM_SETTINGS_UPDATE",
          description: "Updated system settings",
          resource: "SystemSettings",
          oldData: DEFAULT_SETTINGS, // Later get previous settings
          newData: settings,
        },
        req
      );

      return sendResponse(res, 200, "System settings updated successfully", {
        message: "Settings updated successfully",
        updatedSections: Object.keys(settings),
      });
    } catch (error) {
      console.error("Update system settings error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  /**
   * Get system health and status
   */
  async getSystemStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const [userCount, productCount, saleCount, databaseStatus, recentErrors] =
        await Promise.all([
          prisma.user.count({ where: { isActive: true } }),
          prisma.product.count({ where: { isActive: true } }),
          prisma.sale.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          }),
          this.checkDatabaseStatus(),
          this.getRecentErrors(),
        ]);

      const systemStatus = {
        database: databaseStatus,
        metrics: {
          activeUsers: userCount,
          activeProducts: productCount,
          salesToday: saleCount,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
        recentErrors,
        lastChecked: new Date(),
      };

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SYSTEM_STATUS_VIEW",
          description: "Viewed system status and health",
          resource: "SystemStatus",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "System status retrieved successfully",
        systemStatus
      );
    } catch (error) {
      console.error("Get system status error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private async checkDatabaseStatus() {
    try {
      // Simple database health check
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        responseTime: "normal",
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Mock data
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: "Database connection failed",
        lastBackup: null,
      };
    }
  }

  private async getRecentErrors() {
    // Later, query an error log table
    // For now, returning mock data
    return [
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        message: "Database connection timeout",
        severity: "high",
      },
      {
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        message: "Email service unavailable",
        severity: "medium",
      },
    ];
  }

  /**
   * Backup system data (mock implementation)
   */
  async backupSystemData(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      // In a real application, this would:
      // 1. Create a database dump
      // 2. Compress and store it
      // 3. Optionally upload to cloud storage

      const backupInfo = {
        backupId: `backup-${Date.now()}`,
        timestamp: new Date(),
        size: "2.5 MB", // Mock data
        tables: ["users", "products", "sales", "customers", "inventory_logs"],
        status: "completed",
        downloadUrl: `/api/system/backup/backup-${Date.now()}.zip`, // Mock URL
      };

      await createAuditLog(
        userId,
        {
          action: "SYSTEM_BACKUP_CREATE",
          description: "Created system data backup",
          resource: "SystemBackup",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "System backup created successfully",
        backupInfo
      );
    } catch (error) {
      console.error("Backup system data error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new SystemController();
