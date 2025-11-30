"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_1 = __importDefault(require("../controller/report.controller"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const router = express_1.default.Router();
/**
 * REPORT GENERATION ROUTES
 *
 * Comprehensive business reporting endpoints for sales analysis, inventory management,
 * and performance tracking. Provides detailed insights for strategic decision-making.
 *
 * SECURITY: All report routes restricted to ADMIN and SUPERADMIN roles to protect
 * sensitive business data and financial information.
 */
/**
 * @route   GET /api/reports/sales
 * @desc    Generate comprehensive sales report with revenue analysis, product performance, and payment trends
 * @access  Private (Admin & SuperAdmin only - sensitive financial data)
 * @query   {
 *   startDate: string (required),
 *   endDate: string (required),
 *   groupBy?: "daily" | "weekly" | "monthly" (default: "daily"),
 *   reportType?: "summary" | "detailed" (default: "summary")
 * }
 * @returns {
 *   period: {
 *     startDate: Date,
 *     endDate: Date,
 *     groupBy: string
 *   },
 *   summary: {
 *     totalRevenue: number,
 *     totalSales: number,
 *     averageOrderValue: number,
 *     totalTax: number,
 *     totalDiscount: number
 *   },
 *   trends: Array<{
 *     createdAt: Date,
 *     _sum: { finalAmount: number },
 *     _count: { id: number }
 *   }>,
 *   topProducts: Array<{
 *     product: {
 *       id: string,
 *       name: string,
 *       sku: string,
 *       price: number,
 *       costPrice: number
 *     },
 *     quantitySold: number,
 *     totalRevenue: number,
 *     totalCost: number,
 *     totalProfit: number,
 *     profitMargin: number,
 *     orderCount: number
 *   }>,
 *   paymentMethods: Array<{
 *     paymentMethod: string,
 *     _sum: { finalAmount: number },
 *     _count: { id: number }
 *   }>,
 *   generatedAt: Date
 * }
 *
 * @functionality
 * - Comprehensive sales performance analysis for specified date range
 * - Revenue summary with total sales, average order value, taxes, and discounts
 * - Sales trends grouped by daily, weekly, or monthly intervals
 * - Product performance analysis with profit margins and cost calculations
 * - Payment method breakdown with revenue distribution
 * - Profitability analysis including cost, revenue, and margin calculations
 * - Date-range filtering with validation for required parameters
 * - Parallel data processing for optimal performance
 *
 * @business_insights
 * - Identifies top-performing products and revenue drivers
 * - Analyzes sales trends and seasonal patterns
 * - Calculates profitability at product level
 * - Tracks payment method preferences and trends
 * - Provides data for inventory planning and restocking decisions
 * - Supports pricing strategy and discount optimization
 *
 * @performance_optimizations
 * - Executes 3 parallel database queries for sales, product, and payment data
 * - Efficient aggregation using Prisma groupBy and aggregate functions
 * - Selective field loading to minimize data transfer
 * - Profit calculations performed in-memory for complex business logic
 * - Date filtering at database level for optimal query performance
 *
 * @validation
 * - Requires both startDate and endDate parameters
 * - Validates date format and logical date ranges
 * - Ensures only COMPLETED sales are included in analysis
 * - Handles missing cost price data gracefully in profit calculations
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects sensitive financial and sales performance data
 * - Comprehensive audit logging for compliance and tracking
 * - Prevents unauthorized access to business intelligence
 *
 * @audit_logging
 * - Logs every report generation with "SALES_REPORT_GENERATE" action
 * - Records date range and user context for audit trail
 * - Tracks access to sensitive financial reporting data
 */
router.get("/reports/sales", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, report_controller_1.default.generateSalesReport);
/**
 * @route   GET /api/reports/inventory
 * @desc    Generate comprehensive inventory report with stock analysis, movement tracking, and value assessment
 * @access  Private (Admin & SuperAdmin only - inventory management data)
 * @query   { reportType?: "stock-levels" (default: "stock-levels") }
 * @returns {
 *   reportType: string,
 *   stockLevels: Array<{
 *     id: string,
 *     name: string,
 *     sku: string,
 *     quantity: number,
 *     minStock: number,
 *     maxStock: number,
 *     costPrice: number,
 *     price: number,
 *     category: { name: string }
 *   }>,
 *   lowStockAlerts: Array<{
 *     id: string,
 *     name: string,
 *     sku: string,
 *     quantity: number,
 *     minStock: number,
 *     maxStock: number,
 *     costPrice: number,
 *     price: number,
 *     category: { name: string }
 *   }>,
 *   recentMovements: Array<{
 *     id: string,
 *     type: string,
 *     quantity: number,
 *     previousStock: number,
 *     newStock: number,
 *     reason: string,
 *     createdAt: Date,
 *     product: { id: string, name: string, sku: string },
 *     performedBy: { id: string, name: string }
 *   }>,
 *   inventoryValue: {
 *     totalItems: number
 *   },
 *   generatedAt: Date
 * }
 *
 * @functionality
 * - Complete inventory stock levels with category information
 * - Low stock alerts with products below minimum stock thresholds
 * - Recent inventory movements with user attribution
 * - Stock value assessment and total item counts
 * - Product categorization for organized inventory management
 * - Raw SQL queries for efficient low stock calculations
 * - Movement tracking with timestamps and reasons
 * - Performance-optimized with parallel data processing
 *
 * @business_insights
 * - Identifies inventory items requiring immediate attention
 * - Tracks stock movement patterns and user activities
 * - Provides basis for inventory valuation and accounting
 * - Supports restocking decisions and purchase planning
 * - Monitors inventory health and stock turnover
 * - Enables proactive inventory management
 *
 * @performance_optimizations
 * - Executes 4 parallel database queries for comprehensive inventory data
 * - Uses raw SQL for complex low stock threshold calculations
 * - Limits recent movements to 50 records for performance
 * - Selective field loading with optimized relationship queries
 * - Efficient sorting by quantity for priority management
 *
 * @inventory_management
 * - Categorizes products by stock status (normal, low, out-of-stock)
 * - Tracks all inventory adjustments and movements
 * - Provides cost and pricing information for valuation
 * - Includes category context for departmental analysis
 * - Monitors stock levels against configured thresholds
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects inventory cost data and stock management information
 * - Comprehensive audit logging for inventory access
 * - Prevents unauthorized viewing of inventory valuation
 *
 * @audit_logging
 * - Logs every report generation with "INVENTORY_REPORT_GENERATE" action
 * - Records report type and user context for compliance
 * - Tracks access to inventory management data
 */
router.get("/reports/inventory", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, report_controller_1.default.generateInventoryReport);
exports.default = router;
//# sourceMappingURL=report.route.js.map