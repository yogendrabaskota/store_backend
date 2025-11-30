import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import inventoryController from "../controller/inventory.controller";

const router = express.Router();

/**
 * INVENTORY MANAGEMENT ROUTES
 *
 * All routes require authentication and track inventory movements
 * with comprehensive logging of previousStock → newStock changes
 *
 * SECURITY: Most inventory operations restricted to ADMIN and SUPERADMIN roles
 * to prevent unauthorized stock modifications and maintain audit integrity.
 */

// Inventory routes

/**
 * @route   POST /api/inventory/stock-in
 * @desc    Add stock to a product (Increase inventory)
 * @access  Private (Admin & SuperAdmin only)
 * @body    { productId: string, quantity: number, reason?: string, costPrice?: number }
 * @returns { product: Product, log: InventoryLog } - Updated product and created log
 *
 * @functionality
 * - Increases product quantity by specified amount
 * - Optionally updates product cost price
 * - Creates STOCK_IN inventory log
 * - Uses transaction for data consistency
 * - Validates product existence and active status
 *
 * @security Admin restriction prevents unauthorized stock additions
 */
router.post(
  "/inventory/stock-in",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin, // Restrict to ADMIN and SUPERADMIN
  inventoryController.stockIn
);

/**
 * @route   POST /api/inventory/stock-out
 * @desc    Remove stock from a product (Decrease inventory)
 * @access  Private (Admin & SuperAdmin only)
 * @body    { productId: string, quantity: number, reason?: string }
 * @returns { product: Product, log: InventoryLog } - Updated product and created log
 *
 * @functionality
 * - Decreases product quantity by specified amount
 * - Creates STOCK_OUT inventory log
 * - Validates sufficient stock availability
 * - Uses transaction to prevent negative stock
 * - Ensures product exists and is active
 *
 * @security Admin restriction prevents unauthorized stock removals
 */
router.post(
  "/inventory/stock-out",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin, // Restrict to ADMIN and SUPERADMIN
  inventoryController.stockOut
);

/**
 * @route   POST /api/inventory/adjust
 * @desc    Adjust stock to a specific quantity (Set exact inventory level)
 * @access  Private (Admin & SuperAdmin only)
 * @body    { productId: string, quantity: number, reason?: string }
 * @returns { product: Product, log: InventoryLog, adjustment: { type, quantity } }
 *
 * @functionality
 * - Sets product quantity to exact specified value
 * - Automatically detects adjustment type (STOCK_IN/STOCK_OUT)
 * - Calculates difference from current stock
 * - Creates appropriate inventory log type
 * - Prevents negative stock values
 *
 * @security Admin restriction prevents unauthorized stock adjustments
 */
router.post(
  "/inventory/adjust",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin, // Restrict to ADMIN and SUPERADMIN
  inventoryController.adjustStock
);

/**
 * @route   GET /api/inventory/logs
 * @desc    Get all inventory logs with advanced filtering and pagination
 * @access  Private (All authenticated users - for transparency)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   productId?: string,
 *   type?: InventoryLogType,
 *   startDate?: string,
 *   endDate?: string,
 *   performedById?: string,
 *   saleId?: string
 * }
 * @returns { logs: InventoryLog[], summary: Object, pagination: Object }
 *
 * @functionality
 * - Retrieves comprehensive inventory history
 * - Supports multi-dimensional filtering
 * - Includes product, user, and sale relationships
 * - Provides summary statistics (total stock in/out, sales, returns)
 * - Paginated results with metadata
 * - Date range filtering capabilities
 *
 * @security Read access allowed for all authenticated users for transparency
 */
router.get(
  "/inventory/logs",
  authMiddleware.isAuthenticated,
  inventoryController.getInventoryLogs
);

/**
 * @route   GET /api/inventory/dashboard
 * @desc    Get inventory dashboard with key metrics and analytics
 * @access  Private (Admin & SuperAdmin only - sensitive business intelligence)
 * @query   { startDate?: string, endDate?: string }
 * @returns {
 *   overview: { totalProducts, lowStockProducts, outOfStockProducts, inStockProducts },
 *   stockMovement: { totalStockIn, totalStockOut, totalSales, totalReturns, netChange },
 *   recentActivity: InventoryLog[]
 * }
 *
 * @functionality
 * - Provides overview of inventory health
 * - Shows stock movement analytics for period
 * - Includes low stock and out-of-stock counts
 * - Displays recent inventory activity
 * - Supports date range filtering for analytics
 * - Essential for inventory management decisions
 *
 * @security Admin restriction protects sensitive business intelligence
 */
router.get(
  "/inventory/dashboard",
  authMiddleware.isAuthenticated,
  authMiddleware.isAdmin, // Restrict to ADMIN and SUPERADMIN
  inventoryController.getInventoryDashboard
);

/**
 * @route   GET /api/inventory/product/:productId
 * @desc    Get inventory logs for a specific product with pagination
 * @access  Private (All authenticated users - product-specific transparency)
 * @params  { productId: string }
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   type?: InventoryLogType,
 *   startDate?: string,
 *   endDate?: string
 * }
 * @returns { product: Product, currentStock: number, logs: InventoryLog[], pagination: Object }
 *
 * @functionality
 * - Retrieves complete inventory history for specific product
 * - Includes current stock level
 * - Filters by log type and date range
 * - Paginated results for performance
 * - Useful for product-specific audit trails
 * - Validates product existence
 *
 * @security Read access allowed for all authenticated users
 */
router.get(
  "/inventory/product/:productId",
  authMiddleware.isAuthenticated,
  inventoryController.getProductInventoryLogs
);

/**
 * @route   GET /api/inventory/:logId
 * @desc    Get specific inventory log by ID with full details
 * @access  Private (All authenticated users - audit transparency)
 * @params  { logId: string }
 * @returns { InventoryLog } - Complete log details with relationships
 *
 * @functionality
 * - Retrieves detailed information for single inventory log
 * - Includes product, user, and sale relationships
 * - Provides complete audit trail for specific transaction
 * - Useful for investigation and reporting
 * - Validates log existence
 *
 * @security Read access allowed for all authenticated users for audit purposes
 */
router.get(
  "/inventory/:logId",
  authMiddleware.isAuthenticated,
  inventoryController.getInventoryLogById
);

export default router;
