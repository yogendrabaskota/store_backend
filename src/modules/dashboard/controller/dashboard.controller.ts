import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { createAuditLog, sendResponse } from "../../../globals/helper";
import prisma from "../../../config/prisma";

export class DashboardController {
  /**
   * Get comprehensive business dashboard
   */
  async getBusinessDashboard(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
        if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
      }

      const [
        salesData,
        inventoryData,
        customerData,
        revenueTrends,
        topProducts,
        lowStockAlerts,
        recentActivities,
      ] = await Promise.all([
        this.getSalesData(dateFilter),
        this.getInventoryData(),
        this.getCustomerData(dateFilter),
        this.getRevenueTrends(dateFilter),
        this.getTopProducts(dateFilter),
        this.getLowStockAlerts(),
        this.getRecentActivities(),
      ]);

      const dashboardData = {
        overview: {
          totalRevenue: salesData.totalRevenue,
          totalSales: salesData.totalSales,
          totalProducts: inventoryData.totalProducts,
          totalCustomers: customerData.totalCustomers,
          lowStockItems: inventoryData.lowStockCount,
        },
        sales: salesData,
        inventory: inventoryData,
        customers: customerData,
        trends: revenueTrends,
        topProducts,
        alerts: lowStockAlerts,
        recentActivities,
      };

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "DASHBOARD_VIEW",
          description: "Viewed business dashboard analytics",
          resource: "Dashboard",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Dashboard data retrieved successfully",
        dashboardData
      );
    } catch (error) {
      console.error("Get dashboard error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private async getSalesData(dateFilter: any) {
    const [totalSales, revenueData, salesByStatus, salesByPayment, dailySales] =
      await Promise.all([
        prisma.sale.count({ where: dateFilter }),
        prisma.sale.aggregate({
          where: { ...dateFilter, status: "COMPLETED" },
          _sum: {
            finalAmount: true,
            taxAmount: true,
            discount: true,
          },
          _avg: {
            finalAmount: true,
          },
        }),
        prisma.sale.groupBy({
          by: ["status"],
          where: dateFilter,
          _count: { id: true },
          _sum: { finalAmount: true },
        }),
        prisma.sale.groupBy({
          by: ["paymentMethod"],
          where: { ...dateFilter, status: "COMPLETED" },
          _count: { id: true },
          _sum: { finalAmount: true },
        }),
        prisma.sale.groupBy({
          by: ["createdAt"],
          where: {
            ...dateFilter,
            status: "COMPLETED",
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          _sum: { finalAmount: true },
          _count: { id: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    return {
      totalSales,
      totalRevenue: revenueData._sum.finalAmount?.toNumber() || 0,
      averageOrderValue: revenueData._avg.finalAmount?.toNumber() || 0,
      totalTax: revenueData._sum.taxAmount?.toNumber() || 0,
      totalDiscount: revenueData._sum.discount?.toNumber() || 0,
      byStatus: salesByStatus,
      byPayment: salesByPayment,
      dailyTrends: dailySales,
    };
  }

  private async getInventoryData() {
    const [
      totalProducts,
      lowStockCount,
      outOfStockCount,
      inventoryValue,
      stockMovements,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma
        .$queryRawUnsafe<{ count: number }[]>(
          `SELECT COUNT(*)::int AS count FROM "Product" WHERE "isActive" = true AND "quantity" <= "minStock" AND "quantity" > 0`
        )
        .then((result) => result[0]?.count || 0),
      prisma.product.count({ where: { isActive: true, quantity: 0 } }),
      prisma.product.aggregate({
        where: { isActive: true },
        _sum: {
          quantity: true,
        },
      }),
      prisma.inventoryLog.groupBy({
        by: ["type"],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        _sum: {
          quantity: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalStock: inventoryValue._sum.quantity || 0,
      stockMovements,
    };
  }

  private async getCustomerData(dateFilter: any) {
    const [totalCustomers, newCustomers, topCustomers] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      prisma.sale.groupBy({
        by: ["customerId"],
        where: { ...dateFilter, status: "COMPLETED" },
        _sum: { finalAmount: true },
        _count: { id: true },
        orderBy: {
          _sum: {
            finalAmount: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // Get customer details for top customers
    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (customer) => {
        const customerDetails = await prisma.customer.findUnique({
          where: { id: customer.customerId! },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });
        return {
          customer: customerDetails,
          totalSpent: customer._sum.finalAmount?.toNumber() || 0,
          totalOrders: customer._count.id,
        };
      })
    );

    return {
      totalCustomers,
      newCustomers,
      topCustomers: topCustomersWithDetails,
    };
  }

  private async getRevenueTrends(dateFilter: any) {
    const monthlyRevenue = await prisma.sale.groupBy({
      by: ["createdAt"],
      where: {
        ...dateFilter,
        status: "COMPLETED",
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1), // Current year
        },
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      monthly: monthlyRevenue.map((item) => ({
        month: item.createdAt.toISOString().substring(0, 7),
        revenue: item._sum.finalAmount?.toNumber() || 0,
      })),
    };
  }

  private async getTopProducts(dateFilter: any) {
    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: dateFilter,
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 10,
    });

    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            quantity: true,
          },
        });
        return {
          product,
          totalSold: item._sum.quantity || 0,
          totalRevenue: item._sum.totalPrice?.toNumber() || 0,
          orderCount: item._count.id,
        };
      })
    );

    return productsWithDetails;
  }

  private async getLowStockAlerts() {
    const lowStockProducts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Product" WHERE "isActive" = true AND "quantity" <= "minStock" ORDER BY "quantity" ASC LIMIT 10`
    );

    return lowStockProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.quantity,
      minStock: product.minStock,
      status: product.quantity === 0 ? "Out of Stock" : "Low Stock",
    }));
  }

  private async getRecentActivities() {
    const [recentSales, recentLogs] = await Promise.all([
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          saleNumber: true,
          finalAmount: true,
          status: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          description: true,
          resource: true,
          createdAt: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      recentSales,
      recentActivities: recentLogs,
    };
  }
}

export default new DashboardController();
