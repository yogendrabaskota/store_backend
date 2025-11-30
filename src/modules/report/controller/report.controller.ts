import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { createAuditLog, sendResponse } from "../../../globals/helper";
import prisma from "../../../config/prisma";

export class ReportController {
  /**
   * Generate sales report
   */
  async generateSalesReport(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const {
        startDate,
        endDate,
        groupBy = "daily", // daily, weekly, monthly
        reportType = "summary", // summary, detailed
      } = req.query;

      if (!startDate || !endDate) {
        return sendResponse(res, 400, "Start date and end date are required");
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const dateFilter = {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: "COMPLETED",
      };

      const [salesData, productData, paymentData] = await Promise.all([
        this.getSalesReportData(dateFilter, groupBy as string),
        this.getProductSalesData(dateFilter),
        this.getPaymentMethodData(dateFilter),
      ]);

      const reportData = {
        period: {
          startDate: start,
          endDate: end,
          groupBy,
        },
        summary: salesData.summary,
        trends: salesData.trends,
        topProducts: productData,
        paymentMethods: paymentData,
        generatedAt: new Date(),
      };

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SALES_REPORT_GENERATE",
          description: `Generated sales report from ${startDate} to ${endDate}`,
          resource: "Report",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Sales report generated successfully",
        reportData
      );
    } catch (error) {
      console.error("Generate sales report error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private async getSalesReportData(dateFilter: any, groupBy: string) {
    let groupByField: any;

    switch (groupBy) {
      case "daily":
        groupByField = { createdAt: true };
        break;
      case "weekly":
        // This would require custom SQL for week grouping
        groupByField = { createdAt: true };
        break;
      case "monthly":
        groupByField = { createdAt: true };
        break;
      default:
        groupByField = { createdAt: true };
    }

    const [summary, trends] = await Promise.all([
      prisma.sale.aggregate({
        where: dateFilter,
        _sum: {
          finalAmount: true,
          taxAmount: true,
          discount: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          finalAmount: true,
        },
      }),
      prisma.sale.groupBy({
        by: [groupByField],
        where: dateFilter,
        _sum: {
          finalAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    return {
      summary: {
        totalRevenue: summary._sum.finalAmount?.toNumber() || 0,
        totalSales: summary._count.id,
        averageOrderValue: summary._avg.finalAmount?.toNumber() || 0,
        totalTax: summary._sum.taxAmount?.toNumber() || 0,
        totalDiscount: summary._sum.discount?.toNumber() || 0,
      },
      trends,
    };
  }

  private async getProductSalesData(dateFilter: any) {
    const productSales = await prisma.saleItem.groupBy({
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
    });

    const productsWithDetails = await Promise.all(
      productSales.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
          },
        });

        const revenue = item._sum.totalPrice?.toNumber() || 0;
        const cost = product?.costPrice
          ? item._sum.quantity! * product.costPrice.toNumber()
          : 0;
        const profit = revenue - cost;

        return {
          product,
          quantitySold: item._sum.quantity || 0,
          totalRevenue: revenue,
          totalCost: cost,
          totalProfit: profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          orderCount: item._count.id,
        };
      })
    );

    return productsWithDetails;
  }

  private async getPaymentMethodData(dateFilter: any) {
    return await prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: dateFilter,
      _sum: {
        finalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          finalAmount: "desc",
        },
      },
    });
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { reportType = "stock-levels" } = req.query;

      const [stockLevels, lowStockItems, stockMovements, inventoryValue] =
        await Promise.all([
          this.getStockLevels(),
          this.getLowStockItems(),
          this.getStockMovements(),
          this.getInventoryValue(),
        ]);

      const reportData = {
        reportType,
        stockLevels,
        lowStockAlerts: lowStockItems,
        recentMovements: stockMovements,
        inventoryValue,
        generatedAt: new Date(),
      };

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "INVENTORY_REPORT_GENERATE",
          description: "Generated inventory report",
          resource: "Report",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Inventory report generated successfully",
        reportData
      );
    } catch (error) {
      console.error("Generate inventory report error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private async getStockLevels() {
    return await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minStock: true,
        maxStock: true,
        costPrice: true,
        price: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        quantity: "asc",
      },
    });
  }

  private async getLowStockItems() {
    return await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Product" WHERE "isActive" = true AND "quantity" <= "minStock" ORDER BY "quantity" ASC`
    );
  }

  private async getStockMovements() {
    return await prisma.inventoryLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private async getInventoryValue() {
    const result = await prisma.product.aggregate({
      where: { isActive: true },
      _sum: {
        quantity: true,
      },
    });

    const totalItems = result._sum.quantity || 0;

    // This would require calculating total value based on cost price
    // For now, returning item count
    return {
      totalItems,
      // totalValue: would be calculated based on costPrice * quantity
    };
  }
}

export default new ReportController();
