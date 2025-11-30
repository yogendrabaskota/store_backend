import { Response } from "express";

import prisma from "../../../config/prisma";
import { InventoryLogType, Prisma } from "../../../generated/prisma";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { sendResponse } from "../../../globals/helper";

export class InventoryController {
  async stockIn(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { productId, quantity, reason = "Stock in", costPrice } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!productId || !quantity) {
        return sendResponse(res, 400, "Product ID and quantity are required");
      }

      if (quantity <= 0) {
        return sendResponse(res, 400, "Quantity must be greater than 0");
      }

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id: productId, isActive: true },
          select: { id: true, quantity: true, name: true, costPrice: true },
        });

        if (!product) {
          throw new Error("Product not found or inactive");
        }

        const previousStock = product.quantity;
        const newStock = previousStock + quantity;

        // Update product stock and optionally cost price
        const updateData: any = { quantity: newStock };
        if (costPrice) {
          updateData.costPrice = costPrice;
        }

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: updateData,
          select: {
            id: true,
            name: true,
            quantity: true,
            costPrice: true,
            price: true,
          },
        });

        // Create inventory log
        const inventoryLog = await tx.inventoryLog.create({
          data: {
            type: "STOCK_IN",
            quantity,
            previousStock,
            newStock,
            reason,
            productId,
            performedById: userId,
          },
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
                email: true,
              },
            },
          },
        });

        return {
          product: updatedProduct,
          log: inventoryLog,
        };
      });

      return sendResponse(res, 200, "Stock added successfully", result);
    } catch (error) {
      console.error("Stock in error:", error);

      if (error instanceof Error) {
        if (error.message === "Product not found or inactive") {
          return sendResponse(res, 404, "Product not found or inactive");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async stockOut(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { productId, quantity, reason = "Stock out" } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!productId || !quantity) {
        return sendResponse(res, 400, "Product ID and quantity are required");
      }

      if (quantity <= 0) {
        return sendResponse(res, 400, "Quantity must be greater than 0");
      }

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id: productId, isActive: true },
          select: { id: true, quantity: true, name: true },
        });

        if (!product) {
          throw new Error("Product not found or inactive");
        }

        const previousStock = product.quantity;

        if (previousStock < quantity) {
          throw new Error("Insufficient stock");
        }

        const newStock = previousStock - quantity;

        // Update product stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { quantity: newStock },
          select: {
            id: true,
            name: true,
            quantity: true,
          },
        });

        // Create inventory log
        const inventoryLog = await tx.inventoryLog.create({
          data: {
            type: "STOCK_OUT",
            quantity,
            previousStock,
            newStock,
            reason,
            productId,
            performedById: userId,
          },
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
                email: true,
              },
            },
          },
        });

        return {
          product: updatedProduct,
          log: inventoryLog,
        };
      });

      return sendResponse(res, 200, "Stock removed successfully", result);
    } catch (error) {
      console.error("Stock out error:", error);

      if (error instanceof Error) {
        if (error.message === "Product not found or inactive") {
          return sendResponse(res, 404, "Product not found or inactive");
        }
        if (error.message === "Insufficient stock") {
          return sendResponse(res, 400, "Insufficient stock");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async adjustStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { productId, quantity, reason = "Stock adjustment" } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (!productId || quantity === undefined) {
        return sendResponse(res, 400, "Product ID and quantity are required");
      }

      if (quantity < 0) {
        return sendResponse(res, 400, "Quantity cannot be negative");
      }

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id: productId, isActive: true },
          select: { id: true, quantity: true, name: true },
        });

        if (!product) {
          throw new Error("Product not found or inactive");
        }

        const previousStock = product.quantity;
        const newStock = quantity;
        const adjustmentQuantity = Math.abs(newStock - previousStock);

        // Update product stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { quantity: newStock },
          select: {
            id: true,
            name: true,
            quantity: true,
          },
        });

        // Determine log type based on adjustment
        const logType: InventoryLogType =
          newStock > previousStock ? "STOCK_IN" : "STOCK_OUT";

        // Create inventory log
        const inventoryLog = await tx.inventoryLog.create({
          data: {
            type: logType,
            quantity: adjustmentQuantity,
            previousStock,
            newStock,
            reason,
            productId,
            performedById: userId,
          },
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
                email: true,
              },
            },
          },
        });

        return {
          product: updatedProduct,
          log: inventoryLog,
          adjustment: {
            type: logType,
            quantity: adjustmentQuantity,
          },
        };
      });

      return sendResponse(res, 200, "Stock adjusted successfully", result);
    } catch (error) {
      console.error("Adjust stock error:", error);

      if (error instanceof Error) {
        if (error.message === "Product not found or inactive") {
          return sendResponse(res, 404, "Product not found or inactive");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getInventoryLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
        productId,
        type,
        startDate,
        endDate,
        performedById,
        saleId,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.InventoryLogWhereInput = {};

      // Product filter
      if (productId) {
        where.productId = productId as string;
      }

      // Type filter
      if (type) {
        where.type = type as InventoryLogType;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Performed by filter
      if (performedById) {
        where.performedById = performedById as string;
      }

      // Sale filter
      if (saleId) {
        where.saleId = saleId as string;
      }

      // Execute parallel queries
      const [logs, totalCount, summary] = await Promise.all([
        // Main query for logs
        prisma.inventoryLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            sale: {
              select: {
                id: true,
                saleNumber: true,
                status: true,
              },
            },
          },
        }),

        // Total count
        prisma.inventoryLog.count({ where }),

        // Get summary statistics
        this.getInventorySummary(where),
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

      return sendResponse(
        res,
        200,
        "Inventory logs retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get inventory logs error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getProductInventoryLogs(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { productId } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
        type,
        startDate,
        endDate,
      } = req.query;

      if (!productId) {
        return sendResponse(res, 400, "Product ID is required");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sku: true },
      });

      if (!product) {
        return sendResponse(res, 404, "Product not found");
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.InventoryLogWhereInput = {
        productId,
      };

      // Type filter
      if (type) {
        where.type = type as InventoryLogType;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Execute parallel queries
      const [logs, totalCount, currentStock] = await Promise.all([
        // Main query for logs
        prisma.inventoryLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            sale: {
              select: {
                id: true,
                saleNumber: true,
                status: true,
              },
            },
          },
        }),

        // Total count
        prisma.inventoryLog.count({ where }),

        // Get current stock
        prisma.product.findUnique({
          where: { id: productId },
          select: { quantity: true },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        product,
        currentStock: currentStock?.quantity || 0,
        logs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      };

      return sendResponse(
        res,
        200,
        "Product inventory logs retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get product inventory logs error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getInventoryLogById(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { logId } = req.params;

      if (!logId) {
        return sendResponse(res, 400, "Log ID is required");
      }

      const log = await prisma.inventoryLog.findUnique({
        where: { id: logId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              quantity: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sale: {
            select: {
              id: true,
              saleNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!log) {
        return sendResponse(res, 404, "Inventory log not found");
      }

      return sendResponse(
        res,
        200,
        "Inventory log retrieved successfully",
        log
      );
    } catch (error) {
      console.error("Get inventory log by ID error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async createSaleInventoryLog(
    productId: string,
    quantity: number,
    saleId: string,
    userId: string,
    type: "SALE" | "RETURN" = "SALE"
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, quantity: true },
        });

        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        const previousStock = product.quantity;
        let newStock = previousStock;

        if (type === "SALE") {
          if (previousStock < quantity) {
            throw new Error(`Insufficient stock for product ${productId}`);
          }
          newStock = previousStock - quantity;
        } else if (type === "RETURN") {
          newStock = previousStock + quantity;
        }

        // Update product stock
        await tx.product.update({
          where: { id: productId },
          data: { quantity: newStock },
        });

        // Create inventory log
        await tx.inventoryLog.create({
          data: {
            type,
            quantity,
            previousStock,
            newStock,
            reason: type === "SALE" ? "Sale" : "Product return",
            productId,
            performedById: userId,
            saleId,
          },
        });
      });
    } catch (error) {
      console.error("Create sale inventory log error:", error);
      throw error;
    }
  }

  private async getInventorySummary(where: Prisma.InventoryLogWhereInput) {
    const summary = await prisma.inventoryLog.groupBy({
      by: ["type"],
      where,
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    const totalStockIn =
      summary.find((s) => s.type === "STOCK_IN")?._sum.quantity || 0;
    const totalStockOut =
      summary.find((s) => s.type === "STOCK_OUT")?._sum.quantity || 0;
    const totalSales =
      summary.find((s) => s.type === "SALE")?._sum.quantity || 0;
    const totalReturns =
      summary.find((s) => s.type === "RETURN")?._sum.quantity || 0;

    return {
      totalStockIn,
      totalStockOut,
      totalSales,
      totalReturns,
      netChange: totalStockIn - totalStockOut - totalSales + totalReturns,
      logCount: summary.reduce((acc, curr) => acc + curr._count.id, 0),
    };
  }

  async getInventoryDashboard(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: Prisma.InventoryLogWhereInput = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
        if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
      }

      const [
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        recentLogs,
        stockMovement,
      ] = await Promise.all([
        // Total active products
        prisma.product.count({
          where: { isActive: true },
        }),

        // Low stock products (quantity <= minStock)
        prisma
          .$queryRawUnsafe<{ count: number }[]>(
            `
          SELECT COUNT(*)::int AS count
          FROM "Product"
          WHERE "isActive" = true
          AND "quantity" <= "minStock"
          AND "quantity" > 0
        `
          )
          .then((result) => result[0]?.count || 0),

        // Out of stock products
        prisma.product.count({
          where: { isActive: true, quantity: 0 },
        }),

        // Recent inventory logs
        prisma.inventoryLog.findMany({
          where: dateFilter,
          take: 10,
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
        }),

        // Stock movement summary
        this.getInventorySummary(dateFilter),
      ]);

      const dashboardData = {
        overview: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          inStockProducts: totalProducts - outOfStockProducts,
        },
        stockMovement,
        recentActivity: recentLogs,
      };

      return sendResponse(
        res,
        200,
        "Inventory dashboard data retrieved successfully",
        dashboardData
      );
    } catch (error) {
      console.error("Get inventory dashboard error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new InventoryController();
