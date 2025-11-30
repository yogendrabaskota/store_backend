"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleController = void 0;
const prisma_1 = require("../../../generated/prisma");
const helper_1 = require("../../../globals/helper");
const prisma_2 = __importDefault(require("../../../config/prisma"));
const inventory_controller_1 = __importDefault(require("../../inventory/controller/inventory.controller"));
class SaleController {
    generateSaleNumber() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        return `SALE-${timestamp}-${random}`;
    }
    async createSale(req, res) {
        try {
            const { customerId, items, paymentMethod, taxAmount = 0, discount = 0, notes, } = req.body;
            const userId = req.user?.id;
            // Validation
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "Authentication required");
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                return (0, helper_1.sendResponse)(res, 400, "Sale items are required");
            }
            if (!paymentMethod) {
                return (0, helper_1.sendResponse)(res, 400, "Payment method is required");
            }
            // Validate items
            for (const item of items) {
                if (!item.productId || !item.quantity || item.quantity <= 0) {
                    return (0, helper_1.sendResponse)(res, 400, "Each item must have productId and positive quantity");
                }
            }
            // Check if customer exists (if provided)
            if (customerId) {
                const customer = await prisma_2.default.customer.findUnique({
                    where: { id: customerId },
                });
                if (!customer) {
                    return (0, helper_1.sendResponse)(res, 404, "Customer not found");
                }
            }
            // Generate sale number
            const saleNumber = this.generateSaleNumber();
            // Use transaction for atomic operation
            const result = await prisma_2.default.$transaction(async (tx) => {
                // Calculate totals and validate stock
                let totalAmount = new prisma_1.Prisma.Decimal(0);
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
                        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
                    }
                    const unitPrice = item.unitPrice
                        ? new prisma_1.Prisma.Decimal(item.unitPrice)
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
                    .plus(new prisma_1.Prisma.Decimal(taxAmount))
                    .minus(new prisma_1.Prisma.Decimal(discount));
                // Create sale
                const sale = await tx.sale.create({
                    data: {
                        saleNumber,
                        totalAmount,
                        taxAmount: new prisma_1.Prisma.Decimal(taxAmount),
                        discount: new prisma_1.Prisma.Decimal(discount),
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
                    await inventory_controller_1.default.createSaleInventoryLog(item.productId, item.quantity, sale.id, userId, "SALE");
                }
                return sale;
            });
            // Create audit log after successful transaction
            await (0, helper_1.createAuditLog)(userId, {
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
            }, req);
            return (0, helper_1.sendResponse)(res, 201, "Sale created successfully", result);
        }
        catch (error) {
            console.error("Create sale error:", error);
            if (error instanceof Error) {
                if (error.message.includes("not found")) {
                    return (0, helper_1.sendResponse)(res, 404, error.message);
                }
                if (error.message.includes("Insufficient stock")) {
                    return (0, helper_1.sendResponse)(res, 400, error.message);
                }
            }
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getSales(req, res) {
        try {
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", startDate, endDate, status, paymentMethod, staffId, customerId, } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {};
            // Date range filter
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            // Status filter
            if (status) {
                where.status = status;
            }
            // Payment method filter
            if (paymentMethod) {
                where.paymentMethod = paymentMethod;
            }
            // Staff filter
            if (staffId) {
                where.staffId = staffId;
            }
            // Customer filter
            if (customerId) {
                where.customerId = customerId;
            }
            // Execute parallel queries for better performance
            const [sales, totalCount, summary] = await Promise.all([
                // Main query for sales
                prisma_2.default.sale.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { [sortBy]: sortOrder },
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
                prisma_2.default.sale.count({ where }),
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "SALES_VIEW",
                description: "Viewed sales list with filters",
                resource: "Sale",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Sales retrieved successfully", responseData);
        }
        catch (error) {
            console.error("Get sales error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getSaleById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "Sale ID is required");
            }
            const sale = await prisma_2.default.sale.findUnique({
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
                return (0, helper_1.sendResponse)(res, 404, "Sale not found");
            }
            // Create audit log for view
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "SALE_DETAIL_VIEW",
                description: `Viewed sale details: ${sale.saleNumber}`,
                resource: "Sale",
                resourceId: id,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Sale retrieved successfully", sale);
        }
        catch (error) {
            console.error("Get sale by ID error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async updateSaleStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "Authentication required");
            }
            if (!id || !status) {
                return (0, helper_1.sendResponse)(res, 400, "Sale ID and status are required");
            }
            // Get existing sale data
            const existingSale = await prisma_2.default.sale.findUnique({
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
                return (0, helper_1.sendResponse)(res, 404, "Sale not found");
            }
            const oldStatus = existingSale.status;
            // Validate status transition
            if (!this.isValidStatusTransition(oldStatus, status)) {
                return (0, helper_1.sendResponse)(res, 400, `Invalid status transition from ${oldStatus} to ${status}`);
            }
            // Use transaction for status update and potential inventory updates
            const updatedSale = await prisma_2.default.$transaction(async (tx) => {
                // Update sale status
                const sale = await tx.sale.update({
                    where: { id },
                    data: {
                        status: status,
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
                        await inventory_controller_1.default.createSaleInventoryLog(item.productId, item.quantity, sale.id, userId, "RETURN");
                    }
                }
                return sale;
            });
            // Create audit log after successful transaction
            await (0, helper_1.createAuditLog)(userId, {
                action: "SALE_STATUS_UPDATE",
                description: `Updated sale ${existingSale.saleNumber} status from ${oldStatus} to ${status}. Reason: ${reason || "No reason provided"}`,
                resource: "Sale",
                resourceId: id,
                oldData: { status: oldStatus },
                newData: { status },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Sale status updated successfully", updatedSale);
        }
        catch (error) {
            console.error("Update sale status error:", error);
            if (error instanceof prisma_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    return (0, helper_1.sendResponse)(res, 404, "Sale not found");
                }
            }
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    isValidStatusTransition(from, to) {
        const validTransitions = {
            PENDING: ["COMPLETED", "CANCELLED"],
            COMPLETED: ["REFUNDED"],
            CANCELLED: [],
            REFUNDED: [],
        };
        return validTransitions[from]?.includes(to) || false;
    }
    async getSalesSummary(where) {
        const summary = await prisma_2.default.sale.groupBy({
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
        const totalRevenue = summary.reduce((acc, curr) => acc + (curr._sum.finalAmount?.toNumber() || 0), 0);
        return {
            totalSales,
            totalRevenue,
            byStatus: summary.reduce((acc, curr) => {
                acc[curr.status] = {
                    count: curr._count.id,
                    revenue: curr._sum.finalAmount?.toNumber() || 0,
                };
                return acc;
            }, {}),
        };
    }
    async getSalesDashboard(req, res) {
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
            const [todaySales, weeklySales, monthlySales, topProducts, recentSales, revenueStats,] = await Promise.all([
                // Today's sales
                prisma_2.default.sale.count({
                    where: {
                        ...dateFilter,
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                }),
                // Weekly sales
                prisma_2.default.sale.count({
                    where: {
                        ...dateFilter,
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                }),
                // Monthly sales
                prisma_2.default.sale.count({
                    where: {
                        ...dateFilter,
                        createdAt: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                }),
                // Top selling products
                prisma_2.default.saleItem.groupBy({
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
                prisma_2.default.sale.findMany({
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
                prisma_2.default.sale.aggregate({
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
            const topProductsWithDetails = await Promise.all(topProducts.map(async (item) => {
                const product = await prisma_2.default.product.findUnique({
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
            }));
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "SALES_DASHBOARD_VIEW",
                description: "Viewed sales dashboard analytics",
                resource: "Sale",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Sales dashboard data retrieved successfully", dashboardData);
        }
        catch (error) {
            console.error("Get sales dashboard error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async searchSales(req, res) {
        try {
            const { q: searchQuery, page = 1, limit = 20 } = req.query;
            if (!searchQuery?.toString().trim()) {
                return (0, helper_1.sendResponse)(res, 400, "Search query is required");
            }
            const searchTerm = searchQuery.toString().trim();
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;
            const where = {
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
                prisma_2.default.sale.findMany({
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
                prisma_2.default.sale.count({ where }),
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "SALES_SEARCH",
                description: `Searched sales with query: "${searchTerm}"`,
                resource: "Sale",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Sales search completed", responseData);
        }
        catch (error) {
            console.error("Search sales error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
}
exports.SaleController = SaleController;
exports.default = new SaleController();
//# sourceMappingURL=sale.controller.js.map