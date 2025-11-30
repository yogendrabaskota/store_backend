import express from "express";
import dashboardController from "../controller/dashboard.controller";
import authMiddleware from "../../../middleware/auth.middleware";

const router = express.Router();

/**
 * DASHBOARD ANALYTICS ROUTES
 *
 * Comprehensive business intelligence and real-time analytics endpoints
 * providing management with actionable insights across sales, inventory,
 * customers, and operational performance.
 *
 * SECURITY: All dashboard routes restricted to ADMIN and SUPERADMIN roles
 * to protect sensitive business intelligence and financial analytics.
 */

/**
 * @route   GET /api/dashboard/business
 * @desc    Get comprehensive business dashboard with real-time analytics and KPIs
 * @access  Private (Admin & SuperAdmin only - sensitive business intelligence)
 * @query   { startDate?: string, endDate?: string }
 * @returns {
 *   overview: {
 *     totalRevenue: number,
 *     totalSales: number,
 *     totalProducts: number,
 *     totalCustomers: number,
 *     lowStockItems: number
 *   },
 *   sales: {
 *     totalSales: number,
 *     totalRevenue: number,
 *     averageOrderValue: number,
 *     totalTax: number,
 *     totalDiscount: number,
 *     byStatus: Array<{ status: string, _count: { id: number }, _sum: { finalAmount: number } }>,
 *     byPayment: Array<{ paymentMethod: string, _count: { id: number }, _sum: { finalAmount: number } }>,
 *     dailyTrends: Array<{ createdAt: Date, _sum: { finalAmount: number }, _count: { id: number } }>
 *   },
 *   inventory: {
 *     totalProducts: number,
 *     lowStockCount: number,
 *     outOfStockCount: number,
 *     totalStock: number,
 *     stockMovements: Array<{ type: string, _sum: { quantity: number }, _count: { id: number } }>
 *   },
 *   customers: {
 *     totalCustomers: number,
 *     newCustomers: number,
 *     topCustomers: Array<{
 *       customer: { id: string, name: string, email: string, phone: string },
 *       totalSpent: number,
 *       totalOrders: number
 *     }>
 *   },
 *   trends: {
 *     monthly: Array<{ month: string, revenue: number }>
 *   },
 *   topProducts: Array<{
 *     product: { id: string, name: string, sku: string, price: number, quantity: number },
 *     totalSold: number,
 *     totalRevenue: number,
 *     orderCount: number
 *   }>,
 *   alerts: Array<{
 *     id: string,
 *     name: string,
 *     sku: string,
 *     currentStock: number,
 *     minStock: number,
 *     status: "Out of Stock" | "Low Stock"
 *   }>,
 *   recentActivities: {
 *     recentSales: Array<{
 *       id: string,
 *       saleNumber: string,
 *       finalAmount: number,
 *       status: string,
 *       createdAt: Date,
 *       customer: { name: string }
 *     }>,
 *     recentActivities: Array<{
 *       id: string,
 *       action: string,
 *       description: string,
 *       resource: string,
 *       createdAt: Date,
 *       user: { name: string }
 *     }>
 *   }
 * }
 *
 * @functionality
 * - Real-time business performance metrics and KPIs
 * - Sales analytics with revenue trends and payment method breakdown
 * - Inventory health monitoring with stock levels and movements
 * - Customer analytics including new customers and top spenders
 * - Revenue trend analysis with monthly performance data
 * - Top-performing products with sales volume and revenue
 * - Low stock alerts for inventory management (top 10 critical items)
 * - Recent sales and system activities for operational awareness
 * - Date-range filtering for period-based analysis
 * - Parallel data fetching for optimal performance (7 concurrent queries)
 *
 * @performance_optimizations
 * - Executes 7 parallel database queries for optimal performance
 * - Implements efficient aggregation and grouping operations
 * - Uses selective field loading to minimize data transfer
 * - Includes limits for large datasets (top 10 products, 5 recent activities)
 * - Covers 30-day sales trends and 7-day inventory movements
 * - Raw SQL queries for complex stock calculations
 *
 * @data_sources
 * - Sales data with status and payment method breakdown
 * - Inventory counts and stock movement analysis
 * - Customer metrics and top spenders
 * - Revenue trends for current year
 * - Top-selling products with details
 * - Low stock alerts with product information
 * - Recent sales and audit log activities
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects sensitive financial and business intelligence data
 * - Comprehensive audit logging for compliance
 * - Prevents unauthorized access to business analytics
 *
 * @business_value
 * - Enables data-driven decision making for management
 * - Provides real-time visibility into business health
 * - Identifies sales trends and revenue opportunities
 * - Supports inventory optimization and stock management
 * - Enhances customer relationship management through insights
 * - Facilitates strategic planning and performance forecasting
 * - Monitors operational efficiency and system usage
 *
 * @audit_logging
 * - Logs every dashboard view with "DASHBOARD_VIEW" action
 * - Tracks user access to sensitive business intelligence
 * - Records timestamp and user context for compliance
 *
 * @error_handling
 * - Comprehensive try-catch error handling
 * - Returns 500 for internal server errors
 * - Maintains error logging for debugging
 * - Graceful degradation on partial data failures
 */
router.get(
  "/dashboard/business",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  dashboardController.getBusinessDashboard
);

export default router;
