import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import saleController from "../controller/sale.controller";

const router = express.Router();

/**
 * SALES MANAGEMENT ROUTES
 *
 * All routes require authentication and provide comprehensive sales tracking
 * with inventory integration, financial calculations, and audit logging.
 *
 * SECURITY: Write operations restricted to ADMIN and authorized STAFF roles
 * to maintain financial integrity and prevent unauthorized sales modifications.
 */

/**
 * @route   POST /api/sales
 * @desc    Create a new sale with automatic inventory updates and financial calculations
 * @access  Private (Staff, Admin & SuperAdmin only)
 * @body    {
 *   customerId?: string,
 *   items: Array<{ productId: string, quantity: number, unitPrice?: number }>,
 *   paymentMethod: PaymentMethod,
 *   taxAmount?: number,
 *   discount?: number,
 *   notes?: string
 * }
 * @returns { sale: Sale, items: SaleItem[] } - Created sale with items and inventory updates
 *
 * @functionality
 * - Generates unique sale number automatically
 * - Validates product availability and stock levels
 * - Calculates totals, taxes, and discounts
 * - Updates inventory automatically via InventoryController
 * - Creates comprehensive audit log with financial details
 * - Associates sale with staff member and optional customer
 *
 * @security Staff+ restriction ensures only authorized personnel can process sales
 * @business Critical financial operation requiring staff-level access
 */
router.post(
  "/sales",
  authMiddleware.isAuthenticated,
  authMiddleware.restrictTo("STAFF", "ADMIN", "SUPERADMIN"),
  saleController.createSale
);

/**
 * @route   GET /api/sales
 * @desc    Get all sales with advanced filtering, pagination, and comprehensive analytics
 * @access  Private (All authenticated users - sales transparency)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   startDate?: string,
 *   endDate?: string,
 *   status?: SaleStatus,
 *   paymentMethod?: PaymentMethod,
 *   staffId?: string,
 *   customerId?: string
 * }
 * @returns { sales: Sale[], summary: Object, pagination: Object } - Sales list with analytics
 *
 * @functionality
 * - Multi-dimensional filtering (date, status, payment method, staff, customer)
 * - Paginated results with performance limits
 * - Summary statistics (total sales, revenue by status)
 * - Includes staff, customer, and item relationships
 * - Comprehensive sales analytics and reporting
 *
 * @security Read access for all authenticated users maintains sales transparency
 */
router.get("/sales", authMiddleware.isAuthenticated, saleController.getSales);

/**
 * @route   GET /api/sales/dashboard
 * @desc    Get comprehensive sales dashboard with key metrics, analytics, and insights
 * @access  Private (Admin & SuperAdmin only - sensitive business intelligence)
 * @query   { startDate?: string, endDate?: string }
 * @returns {
 *   overview: { todaySales, weeklySales, monthlySales, totalRevenue, averageOrderValue },
 *   topProducts: Array<{ product, totalQuantity, totalRevenue, saleCount }>,
 *   recentSales: Sale[],
 *   revenueBreakdown: { total, tax, discount }
 * }
 *
 * @functionality
 * - Real-time sales performance metrics
 * - Top-selling products analysis
 * - Revenue breakdown and trends
 * - Recent sales activity tracking
 * - Date-range filtering for period analysis
 * - Essential for business decision-making
 *
 * @security Admin restriction protects sensitive business intelligence and financial analytics
 */
router.get(
  "/sales/dashboard",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  saleController.getSalesDashboard
);

/**
 * @route   GET /api/sales/search
 * @desc    Search sales across multiple fields with intelligent matching
 * @access  Private (All authenticated users - operational needs)
 * @query   { q: string, page?: number, limit?: number }
 * @returns { sales: Sale[], searchMeta: Object, pagination: Object }
 *
 * @functionality
 * - Multi-field search (sale number, customer name/email, staff name)
 * - Case-insensitive partial matching
 * - Paginated results for performance
 * - Maintains search context and metadata
 * - Useful for customer service and operational lookups
 *
 * @security Read access for all authenticated users supports operational efficiency
 */
router.get(
  "/sales/search",
  authMiddleware.isAuthenticated,
  saleController.searchSales
);

/**
 * @route   GET /api/sales/:id
 * @desc    Get detailed sale information by ID with complete relationships
 * @access  Private (All authenticated users - sales transparency)
 * @params  { id: string }
 * @returns { sale: Sale } - Complete sale details with items, customer, staff, and inventory logs
 *
 * @functionality
 * - Full sale details with all line items
 * - Customer and staff information
 * - Product details with pricing
 * - Recent inventory activity related to sale
 * - Complete financial breakdown
 * - Essential for customer service and dispute resolution
 *
 * @security Read access for transparency in sales operations and customer service
 */
router.get(
  "/sales/:id",
  authMiddleware.isAuthenticated,
  saleController.getSaleById
);

/**
 * @route   PATCH /api/sales/:id/status
 * @desc    Update sale status with validation and automatic inventory adjustments
 * @access  Private (Admin & SuperAdmin only - critical financial operation)
 * @params  { id: string }
 * @body    { status: SaleStatus, reason?: string }
 * @returns { sale: Sale } - Updated sale with new status
 *
 * @functionality
 * - Validates status transitions (e.g., cannot cancel completed sale)
 * - Automatically handles inventory for returns/refunds/cancellations
 * - Tracks reason for status change in audit log
 * - Ensures financial integrity through validation
 * - Maintains complete audit trail of status changes
 *
 * @security Admin restriction required for critical financial operations and inventory adjustments
 * @business Prevents unauthorized refunds, cancellations, and inventory manipulations
 */
router.patch(
  "/sales/:id/status",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin,
  saleController.updateSaleStatus
);

export default router;
