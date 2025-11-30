"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const helper_1 = require("../../../globals/helper");
const prisma_1 = __importDefault(require("../../../config/prisma"));
class DashboardController {
    /**
     * Get comprehensive business dashboard
     */
    async getBusinessDashboard(req, res) {
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
            const [salesData, inventoryData, customerData, revenueTrends, topProducts, lowStockAlerts, recentActivities,] = await Promise.all([
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
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "DASHBOARD_VIEW",
                description: "Viewed business dashboard analytics",
                resource: "Dashboard",
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Dashboard data retrieved successfully", dashboardData);
        }
        catch (error) {
            console.error("Get dashboard error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getSalesData(dateFilter) {
        const [totalSales, revenueData, salesByStatus, salesByPayment, dailySales] = await Promise.all([
            prisma_1.default.sale.count({ where: dateFilter }),
            prisma_1.default.sale.aggregate({
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
            prisma_1.default.sale.groupBy({
                by: ["status"],
                where: dateFilter,
                _count: { id: true },
                _sum: { finalAmount: true },
            }),
            prisma_1.default.sale.groupBy({
                by: ["paymentMethod"],
                where: { ...dateFilter, status: "COMPLETED" },
                _count: { id: true },
                _sum: { finalAmount: true },
            }),
            prisma_1.default.sale.groupBy({
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
    async getInventoryData() {
        const [totalProducts, lowStockCount, outOfStockCount, inventoryValue, stockMovements,] = await Promise.all([
            prisma_1.default.product.count({ where: { isActive: true } }),
            prisma_1.default
                .$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "Product" WHERE "isActive" = true AND "quantity" <= "minStock" AND "quantity" > 0`)
                .then((result) => result[0]?.count || 0),
            prisma_1.default.product.count({ where: { isActive: true, quantity: 0 } }),
            prisma_1.default.product.aggregate({
                where: { isActive: true },
                _sum: {
                    quantity: true,
                },
            }),
            prisma_1.default.inventoryLog.groupBy({
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
    async getCustomerData(dateFilter) {
        const [totalCustomers, newCustomers, topCustomers] = await Promise.all([
            prisma_1.default.customer.count(),
            prisma_1.default.customer.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
            prisma_1.default.sale.groupBy({
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
        const topCustomersWithDetails = await Promise.all(topCustomers.map(async (customer) => {
            const customerDetails = await prisma_1.default.customer.findUnique({
                where: { id: customer.customerId },
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
        }));
        return {
            totalCustomers,
            newCustomers,
            topCustomers: topCustomersWithDetails,
        };
    }
    async getRevenueTrends(dateFilter) {
        const monthlyRevenue = await prisma_1.default.sale.groupBy({
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
    async getTopProducts(dateFilter) {
        const topProducts = await prisma_1.default.saleItem.groupBy({
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
        const productsWithDetails = await Promise.all(topProducts.map(async (item) => {
            const product = await prisma_1.default.product.findUnique({
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
        }));
        return productsWithDetails;
    }
    async getLowStockAlerts() {
        const lowStockProducts = await prisma_1.default.$queryRawUnsafe(`SELECT * FROM "Product" WHERE "isActive" = true AND "quantity" <= "minStock" ORDER BY "quantity" ASC LIMIT 10`);
        return lowStockProducts.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            currentStock: product.quantity,
            minStock: product.minStock,
            status: product.quantity === 0 ? "Out of Stock" : "Low Stock",
        }));
    }
    async getRecentActivities() {
        const [recentSales, recentLogs] = await Promise.all([
            prisma_1.default.sale.findMany({
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
            prisma_1.default.auditLog.findMany({
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
exports.DashboardController = DashboardController;
exports.default = new DashboardController();
//# sourceMappingURL=dashboard.controller.js.map