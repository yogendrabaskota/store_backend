import { Response } from "express";
import { PaymentMethod, Prisma, SaleStatus } from "../../../generated/prisma";
// import {  Prisma } from "@prisma/client";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { createAuditLog, sendResponse } from "../../../globals/helper";
import prisma from "../../../config/prisma";
import inventoryController from "../../inventory/controller/inventory.controller";
// import { SaleStatus } from "../../../globals/types";

export class SaleController {
  private generateSaleNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `SALE-${timestamp}-${random}`;
  }

  async createSale(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        customerId,
        items,
        paymentMethod,
        taxAmount = 0,
        discount = 0,
        notes,
      } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendResponse(res, 400, "Sale items are required");
      }

      if (!paymentMethod) {
        return sendResponse(res, 400, "Payment method is required");
      }

      // Validate items
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return sendResponse(
            res,
            400,
            "Each item must have productId and positive quantity"
          );
        }
      }

      // Check if customer exists (if provided)
      if (customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer) {
          return sendResponse(res, 404, "Customer not found");
        }
      }

      // Generate sale number
      const saleNumber = this.generateSaleNumber();

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Calculate totals and validate stock
        let totalAmount = new Prisma.Decimal(0);
        const saleItemsData = [];

        for (const item of items) {
          // Get product with current price and stock
          const product = await tx.product.findUnique({
            where: { id: item.productId, isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
              sku: true,
            },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found or inactive`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
            );
          }

          const unitPrice = item.unitPrice
            ? new Prisma.Decimal(item.unitPrice)
            : product.price;
          const totalPrice = unitPrice.times(item.quantity);

          totalAmount = totalAmount.plus(totalPrice);

          saleItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          });
        }

        const finalAmount = totalAmount
          .plus(new Prisma.Decimal(taxAmount))
          .minus(new Prisma.Decimal(discount));

        // Create sale
        const sale = await tx.sale.create({
          data: {
            saleNumber,
            totalAmount,
            taxAmount: new Prisma.Decimal(taxAmount),
            discount: new Prisma.Decimal(discount),
            finalAmount,
            paymentMethod,
            status: "COMPLETED",
            staffId: userId,
            customerId: customerId || null,
            items: {
              create: saleItemsData,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            staff: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Update inventory for each item
        for (const item of items) {
          await inventoryController.createSaleInventoryLog(
            item.productId,
            item.quantity,
            sale.id,
            userId,
            "SALE"
          );
        }

        return sale;
      });

      // Create audit log after successful transaction
      await createAuditLog(
        userId,
        {
          action: "SALE_CREATE",
          description: `Created sale ${saleNumber} with ${items.length} items. Total: $${result.finalAmount}`,
          resource: "Sale",
          resourceId: result.id,
          newData: {
            saleNumber: result.saleNumber,
            totalAmount: result.totalAmount,
            finalAmount: result.finalAmount,
            paymentMethod: result.paymentMethod,
            itemCount: items.length,
            customerId: result.customerId,
          },
        },
        req
      );

      return sendResponse(res, 201, "Sale created successfully", result);
    } catch (error) {
      console.error("Create sale error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return sendResponse(res, 404, error.message);
        }
        if (error.message.includes("Insufficient stock")) {
          return sendResponse(res, 400, error.message);
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getSales(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        startDate,
        endDate,
        status,
        paymentMethod,
        staffId,
        customerId,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.SaleWhereInput = {};

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Status filter
      if (status) {
        where.status = status as SaleStatus;
      }

      // Payment method filter
      if (paymentMethod) {
        where.paymentMethod = paymentMethod as PaymentMethod;
      }

      // Staff filter
      if (staffId) {
        where.staffId = staffId as string;
      }

      // Customer filter
      if (customerId) {
        where.customerId = customerId as string;
      }

      // Execute parallel queries for better performance
      const [sales, totalCount, summary] = await Promise.all([
        // Main query for sales
        prisma.sale.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                  },
                },
              },
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
        }),

        // Total count
        prisma.sale.count({ where }),

        // Get summary statistics
        this.getSalesSummary(where),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        sales,
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

      // Create audit log for view
      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SALES_VIEW",
          description: "Viewed sales list with filters",
          resource: "Sale",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Sales retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get sales error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getSaleById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return sendResponse(res, 400, "Sale ID is required");
      }

      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  barcode: true,
                  price: true,
                  costPrice: true,
                },
              },
            },
          },
          inventoryLogs: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              quantity: true,
              previousStock: true,
              newStock: true,
              reason: true,
              createdAt: true,
            },
          },
        },
      });

      if (!sale) {
        return sendResponse(res, 404, "Sale not found");
      }

      // Create audit log for view
      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SALE_DETAIL_VIEW",
          description: `Viewed sale details: ${sale.saleNumber}`,
          resource: "Sale",
          resourceId: id,
        },
        req
      );

      return sendResponse(res, 200, "Sale retrieved successfully", sale);
    } catch (error) {
      console.error("Get sale by ID error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async updateSaleStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!id || !status) {
        return sendResponse(res, 400, "Sale ID and status are required");
      }

      // Get existing sale data
      const existingSale = await prisma.sale.findUnique({
        where: { id },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingSale) {
        return sendResponse(res, 404, "Sale not found");
      }

      const oldStatus = existingSale.status;

      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, status as SaleStatus)) {
        return sendResponse(
          res,
          400,
          `Invalid status transition from ${oldStatus} to ${status}`
        );
      }

      // Use transaction for status update and potential inventory updates
      const updatedSale = await prisma.$transaction(async (tx) => {
        // Update sale status
        const sale = await tx.sale.update({
          where: { id },
          data: {
            status: status as SaleStatus,
            updatedAt: new Date(),
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Handle inventory updates for returns/refunds
        if (status === "REFUNDED" || status === "CANCELLED") {
          for (const item of existingSale.items) {
            await inventoryController.createSaleInventoryLog(
              item.productId,
              item.quantity,
              sale.id,
              userId,
              "RETURN"
            );
          }
        }

        return sale;
      });

      // Create audit log after successful transaction
      await createAuditLog(
        userId,
        {
          action: "SALE_STATUS_UPDATE",
          description: `Updated sale ${
            existingSale.saleNumber
          } status from ${oldStatus} to ${status}. Reason: ${
            reason || "No reason provided"
          }`,
          resource: "Sale",
          resourceId: id,
          oldData: { status: oldStatus },
          newData: { status },
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Sale status updated successfully",
        updatedSale
      );
    } catch (error) {
      console.error("Update sale status error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Sale not found");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  private isValidStatusTransition(from: SaleStatus, to: SaleStatus): boolean {
    const validTransitions: Record<SaleStatus, SaleStatus[]> = {
      PENDING: ["COMPLETED", "CANCELLED"],
      COMPLETED: ["REFUNDED"],
      CANCELLED: [],
      REFUNDED: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private async getSalesSummary(where: Prisma.SaleWhereInput) {
    const summary = await prisma.sale.groupBy({
      by: ["status"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
        finalAmount: true,
        taxAmount: true,
        discount: true,
      },
    });

    const totalSales = summary.reduce((acc, curr) => acc + curr._count.id, 0);
    const totalRevenue = summary.reduce(
      (acc, curr) => acc + (curr._sum.finalAmount?.toNumber() || 0),
      0
    );

    return {
      totalSales,
      totalRevenue,
      byStatus: summary.reduce((acc, curr) => {
        acc[curr.status] = {
          count: curr._count.id,
          revenue: curr._sum.finalAmount?.toNumber() || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>),
    };
  }

  async getSalesDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: Prisma.SaleWhereInput = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
        if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
      }

      const [
        todaySales,
        weeklySales,
        monthlySales,
        topProducts,
        recentSales,
        revenueStats,
      ] = await Promise.all([
        // Today's sales
        prisma.sale.count({
          where: {
            ...dateFilter,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Weekly sales
        prisma.sale.count({
          where: {
            ...dateFilter,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Monthly sales
        prisma.sale.count({
          where: {
            ...dateFilter,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Top selling products
        prisma.saleItem.groupBy({
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
          take: 5,
        }),

        // Recent sales
        prisma.sale.findMany({
          where: dateFilter,
          take: 10,
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
            staff: {
              select: {
                name: true,
              },
            },
          },
        }),

        // Revenue statistics
        prisma.sale.aggregate({
          where: {
            ...dateFilter,
            status: "COMPLETED",
          },
          _sum: {
            finalAmount: true,
            taxAmount: true,
            discount: true,
          },
          _avg: {
            finalAmount: true,
          },
        }),
      ]);

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              sku: true,
            },
          });
          return {
            product,
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: item._sum.totalPrice?.toNumber() || 0,
            saleCount: item._count.id,
          };
        })
      );

      const dashboardData = {
        overview: {
          todaySales,
          weeklySales,
          monthlySales,
          totalRevenue: revenueStats._sum.finalAmount?.toNumber() || 0,
          averageOrderValue: revenueStats._avg.finalAmount?.toNumber() || 0,
        },
        topProducts: topProductsWithDetails,
        recentSales,
        revenueBreakdown: {
          total: revenueStats._sum.finalAmount?.toNumber() || 0,
          tax: revenueStats._sum.taxAmount?.toNumber() || 0,
          discount: revenueStats._sum.discount?.toNumber() || 0,
        },
      };

      // Create audit log for dashboard view
      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SALES_DASHBOARD_VIEW",
          description: "Viewed sales dashboard analytics",
          resource: "Sale",
        },
        req
      );

      return sendResponse(
        res,
        200,
        "Sales dashboard data retrieved successfully",
        dashboardData
      );
    } catch (error) {
      console.error("Get sales dashboard error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async searchSales(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { q: searchQuery, page = 1, limit = 20 } = req.query;

      if (!searchQuery?.toString().trim()) {
        return sendResponse(res, 400, "Search query is required");
      }

      const searchTerm = searchQuery.toString().trim();
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.SaleWhereInput = {
        OR: [
          { saleNumber: { contains: searchTerm, mode: "insensitive" } },
          {
            customer: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
          {
            customer: {
              email: { contains: searchTerm, mode: "insensitive" },
            },
          },
          {
            staff: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
        ],
      };

      const [sales, totalCount] = await Promise.all([
        prisma.sale.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
          include: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
        }),
        prisma.sale.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        sales,
        searchMeta: {
          query: searchTerm,
          totalResults: totalCount,
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      };

      await createAuditLog(
        req.user?.id || "SYSTEM",
        {
          action: "SALES_SEARCH",
          description: `Searched sales with query: "${searchTerm}"`,
          resource: "Sale",
        },
        req
      );

      return sendResponse(res, 200, "Sales search completed", responseData);
    } catch (error) {
      console.error("Search sales error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new SaleController();
