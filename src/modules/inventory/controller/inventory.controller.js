"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const prisma_1 = __importDefault(require("../../../config/prisma"));
const helper_1 = require("../../../globals/helper");
class InventoryController {
    async stockIn(req, res) {
        try {
            const { productId, quantity, reason = "Stock in", costPrice } = req.body;
            const userId = req.user?.id;
            // Validation
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "Authentication required");
            }
            if (!productId || !quantity) {
                return (0, helper_1.sendResponse)(res, 400, "Product ID and quantity are required");
            }
            if (quantity <= 0) {
                return (0, helper_1.sendResponse)(res, 400, "Quantity must be greater than 0");
            }
            // get product data for audit log
            const product = await prisma_1.default.product.findUnique({
                where: { id: productId, isActive: true },
                select: {
                    id: true,
                    quantity: true,
                    name: true,
                    sku: true,
                    costPrice: true,
                },
            });
            if (!product) {
                return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
            }
            const previousStock = product.quantity;
            const productName = product.name;
            const productSku = product.sku;
            const newStock = previousStock + quantity;
            // Use transaction for atomic operation
            const result = await prisma_1.default.$transaction(async (tx) => {
                // Get current product with lock (again for transaction safety)
                const lockedProduct = await tx.product.findUnique({
                    where: { id: productId, isActive: true },
                    select: { id: true, quantity: true, name: true, costPrice: true },
                });
                if (!lockedProduct) {
                    throw new Error("Product not found or inactive");
                }
                // Update product stock and optionally cost price
                const updateData = { quantity: newStock };
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
            // Create audit log AFTER successful transaction
            await (0, helper_1.createAuditLog)(userId, {
                action: "STOCK_IN",
                description: `Added ${quantity} units to ${productName} (${productSku})`,
                resource: "Product",
                resourceId: productId,
                oldData: { quantity: previousStock },
                newData: {
                    quantity: newStock,
                    ...(costPrice && { costPrice }),
                },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Stock added successfully", result);
        }
        catch (error) {
            console.error("Stock in error:", error);
            if (error instanceof Error) {
                if (error.message === "Product not found or inactive") {
                    return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
                }
            }
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async stockOut(req, res) {
        try {
            const { productId, quantity, reason = "Stock out" } = req.body;
            const userId = req.user?.id;
            // Validation
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "Authentication required");
            }
            if (!productId || !quantity) {
                return (0, helper_1.sendResponse)(res, 400, "Product ID and quantity are required");
            }
            if (quantity <= 0) {
                return (0, helper_1.sendResponse)(res, 400, "Quantity must be greater than 0");
            }
            // First get product data for audit log
            const product = await prisma_1.default.product.findUnique({
                where: { id: productId, isActive: true },
                select: { id: true, quantity: true, name: true, sku: true },
            });
            if (!product) {
                return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
            }
            const previousStock = product.quantity;
            const productName = product.name;
            const productSku = product.sku;
            if (previousStock < quantity) {
                return (0, helper_1.sendResponse)(res, 400, "Insufficient stock");
            }
            const newStock = previousStock - quantity;
            // Use transaction for atomic operation
            const result = await prisma_1.default.$transaction(async (tx) => {
                // Get current product with lock (again for transaction safety)
                const lockedProduct = await tx.product.findUnique({
                    where: { id: productId, isActive: true },
                    select: { id: true, quantity: true, name: true },
                });
                if (!lockedProduct) {
                    throw new Error("Product not found or inactive");
                }
                if (lockedProduct.quantity < quantity) {
                    throw new Error("Insufficient stock");
                }
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
            // Create audit log AFTER successful transaction
            await (0, helper_1.createAuditLog)(userId, {
                action: "STOCK_OUT",
                description: `Removed ${quantity} units from ${productName} (${productSku})`,
                resource: "Product",
                resourceId: productId,
                oldData: { quantity: previousStock },
                newData: { quantity: newStock },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Stock removed successfully", result);
        }
        catch (error) {
            console.error("Stock out error:", error);
            if (error instanceof Error) {
                if (error.message === "Product not found or inactive") {
                    return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
                }
                if (error.message === "Insufficient stock") {
                    return (0, helper_1.sendResponse)(res, 400, "Insufficient stock");
                }
            }
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async adjustStock(req, res) {
        try {
            const { productId, quantity, reason = "Stock adjustment" } = req.body;
            const userId = req.user?.id;
            // Validation
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "Authentication required");
            }
            if (!productId || quantity === undefined) {
                return (0, helper_1.sendResponse)(res, 400, "Product ID and quantity are required");
            }
            if (quantity < 0) {
                return (0, helper_1.sendResponse)(res, 400, "Quantity cannot be negative");
            }
            // First get product data for audit log
            const product = await prisma_1.default.product.findUnique({
                where: { id: productId, isActive: true },
                select: { id: true, quantity: true, name: true, sku: true },
            });
            if (!product) {
                return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
            }
            const previousStock = product.quantity;
            const productName = product.name;
            const productSku = product.sku;
            const newStock = quantity;
            const adjustmentQuantity = Math.abs(newStock - previousStock);
            const logType = newStock > previousStock ? "STOCK_IN" : "STOCK_OUT";
            // Use transaction for atomic operation
            const result = await prisma_1.default.$transaction(async (tx) => {
                // Get current product with lock (again for transaction safety)
                const lockedProduct = await tx.product.findUnique({
                    where: { id: productId, isActive: true },
                    select: { id: true, quantity: true, name: true },
                });
                if (!lockedProduct) {
                    throw new Error("Product not found or inactive");
                }
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
            // Create audit log AFTER successful transaction
            await (0, helper_1.createAuditLog)(userId, {
                action: "STOCK_ADJUSTMENT",
                description: `Adjusted stock from ${previousStock} to ${quantity} units for ${productName} (${productSku})`,
                resource: "Product",
                resourceId: productId,
                oldData: { quantity: previousStock },
                newData: { quantity: newStock },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Stock adjusted successfully", result);
        }
        catch (error) {
            console.error("Adjust stock error:", error);
            if (error instanceof Error) {
                if (error.message === "Product not found or inactive") {
                    return (0, helper_1.sendResponse)(res, 404, "Product not found or inactive");
                }
            }
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getInventoryLogs(req, res) {
        try {
            const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", productId, type, startDate, endDate, performedById, saleId, } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {};
            // Product filter
            if (productId) {
                where.productId = productId;
            }
            // Type filter
            if (type) {
                where.type = type;
            }
            // Date range filter
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            // Performed by filter
            if (performedById) {
                where.performedById = performedById;
            }
            // Sale filter
            if (saleId) {
                where.saleId = saleId;
            }
            // Execute parallel queries
            const [logs, totalCount, summary] = await Promise.all([
                // Main query for logs
                prisma_1.default.inventoryLog.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { [sortBy]: sortOrder },
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
                prisma_1.default.inventoryLog.count({ where }),
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "INVENTORY_LOGS_VIEW",
                description: "Viewed inventory logs with filters",
                resource: "Inventory",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Inventory logs retrieved successfully", responseData);
        }
        catch (error) {
            console.error("Get inventory logs error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getProductInventoryLogs(req, res) {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", type, startDate, endDate, } = req.query;
            if (!productId) {
                return (0, helper_1.sendResponse)(res, 400, "Product ID is required");
            }
            // Check if product exists
            const product = await prisma_1.default.product.findUnique({
                where: { id: productId },
                select: { id: true, name: true, sku: true },
            });
            if (!product) {
                return (0, helper_1.sendResponse)(res, 404, "Product not found");
            }
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {
                productId,
            };
            // Type filter
            if (type) {
                where.type = type;
            }
            // Date range filter
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            // Execute parallel queries
            const [logs, totalCount, currentStock] = await Promise.all([
                // Main query for logs
                prisma_1.default.inventoryLog.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { [sortBy]: sortOrder },
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
                prisma_1.default.inventoryLog.count({ where }),
                // Get current stock
                prisma_1.default.product.findUnique({
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "PRODUCT_INVENTORY_LOGS_VIEW",
                description: `Viewed inventory logs for product: ${product.name}`,
                resource: "Product",
                resourceId: productId,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Product inventory logs retrieved successfully", responseData);
        }
        catch (error) {
            console.error("Get product inventory logs error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getInventoryLogById(req, res) {
        try {
            const { logId } = req.params;
            if (!logId) {
                return (0, helper_1.sendResponse)(res, 400, "Log ID is required");
            }
            const log = await prisma_1.default.inventoryLog.findUnique({
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
                return (0, helper_1.sendResponse)(res, 404, "Inventory log not found");
            }
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "INVENTORY_LOG_DETAIL_VIEW",
                description: `Viewed inventory log details for ${log.product?.name}`,
                resource: "InventoryLog",
                resourceId: logId,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Inventory log retrieved successfully", log);
        }
        catch (error) {
            console.error("Get inventory log by ID error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async createSaleInventoryLog(productId, quantity, saleId, userId, type = "SALE") {
        try {
            // First get product data for audit log
            const product = await prisma_1.default.product.findUnique({
                where: { id: productId },
                select: { id: true, quantity: true, name: true, sku: true },
            });
            if (!product) {
                throw new Error(`Product ${productId} not found`);
            }
            const previousStock = product.quantity;
            const productName = product.name;
            const productSku = product.sku;
            let newStock = previousStock;
            if (type === "SALE") {
                if (previousStock < quantity) {
                    throw new Error(`Insufficient stock for product ${productId}`);
                }
                newStock = previousStock - quantity;
            }
            else if (type === "RETURN") {
                newStock = previousStock + quantity;
            }
            await prisma_1.default.$transaction(async (tx) => {
                // Get current product with lock (again for transaction safety)
                const lockedProduct = await tx.product.findUnique({
                    where: { id: productId },
                    select: { id: true, quantity: true },
                });
                if (!lockedProduct) {
                    throw new Error(`Product ${productId} not found`);
                }
                if (type === "SALE" && lockedProduct.quantity < quantity) {
                    throw new Error(`Insufficient stock for product ${productId}`);
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
            // Create audit log AFTER successful transaction
            await (0, helper_1.createAuditLog)(userId, {
                action: type === "SALE" ? "SALE_STOCK_UPDATE" : "RETURN_STOCK_UPDATE",
                description: `${type === "SALE" ? "Sold" : "Returned"} ${quantity} units of ${productName} (${productSku}) for sale ${saleId}`,
                resource: "Product",
                resourceId: productId,
                oldData: { quantity: previousStock },
                newData: { quantity: newStock },
            }
            // Note: No req parameter for internal method
            );
        }
        catch (error) {
            console.error("Create sale inventory log error:", error);
            throw error;
        }
    }
    async getInventorySummary(where) {
        const summary = await prisma_1.default.inventoryLog.groupBy({
            by: ["type"],
            where,
            _sum: {
                quantity: true,
            },
            _count: {
                id: true,
            },
        });
        const totalStockIn = summary.find((s) => s.type === "STOCK_IN")?._sum.quantity || 0;
        const totalStockOut = summary.find((s) => s.type === "STOCK_OUT")?._sum.quantity || 0;
        const totalSales = summary.find((s) => s.type === "SALE")?._sum.quantity || 0;
        const totalReturns = summary.find((s) => s.type === "RETURN")?._sum.quantity || 0;
        return {
            totalStockIn,
            totalStockOut,
            totalSales,
            totalReturns,
            netChange: totalStockIn - totalStockOut - totalSales + totalReturns,
            logCount: summary.reduce((acc, curr) => acc + curr._count.id, 0),
        };
    }
    async getInventoryDashboard(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate)
                    dateFilter.createdAt.gte = new Date(startDate);
                if (endDate)
                    dateFilter.createdAt.lte = new Date(endDate);
            }
            const [totalProducts, lowStockProducts, outOfStockProducts, recentLogs, stockMovement,] = await Promise.all([
                // Total active products
                prisma_1.default.product.count({
                    where: { isActive: true },
                }),
                // Low stock products (quantity <= minStock)
                prisma_1.default
                    .$queryRawUnsafe(`
          SELECT COUNT(*)::int AS count
          FROM "Product"
          WHERE "isActive" = true
          AND "quantity" <= "minStock"
          AND "quantity" > 0
        `)
                    .then((result) => result[0]?.count || 0),
                // Out of stock products
                prisma_1.default.product.count({
                    where: { isActive: true, quantity: 0 },
                }),
                // Recent inventory logs
                prisma_1.default.inventoryLog.findMany({
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "INVENTORY_DASHBOARD_VIEW",
                description: "Viewed inventory dashboard analytics",
                resource: "Inventory",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Inventory dashboard data retrieved successfully", dashboardData);
        }
        catch (error) {
            console.error("Get inventory dashboard error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
}
exports.InventoryController = InventoryController;
exports.default = new InventoryController();
//# sourceMappingURL=inventory.controller.js.map