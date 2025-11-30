"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const system_controller_1 = __importDefault(require("../controller/system.controller"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const router = express_1.default.Router();
/**
 * SYSTEM MANAGEMENT ROUTES
 *
 * Comprehensive system configuration, monitoring, and maintenance endpoints
 * for managing business settings, monitoring system health, and performing
 * administrative operations.
 *
 * SECURITY: All system routes restricted to ADMIN and SUPERADMIN roles
 * to protect critical system configuration and operational data.
 */
/**
 * @route   GET /api/system/settings
 * @desc    Get all system configuration settings including business, inventory, sales, and notification preferences
 * @access  Private (Admin & SuperAdmin only - system configuration)
 * @returns {
 *   business: {
 *     name: string,
 *     email: string,
 *     phone: string,
 *     address: string,
 *     currency: string,
 *     taxRate: number
 *   },
 *   inventory: {
 *     lowStockThreshold: number,
 *     autoReorder: boolean,
 *     notifyOnLowStock: boolean
 *   },
 *   sales: {
 *     defaultTaxRate: number,
 *     receiptFooter: string,
 *     allowReturns: boolean,
 *     returnPeriodDays: number
 *   },
 *   notifications: {
 *     lowStockEmail: boolean,
 *     newOrderEmail: boolean,
 *     dailySalesReport: boolean
 *   }
 * }
 *
 * @functionality
 * - Retrieves comprehensive system configuration settings
 * - Business information (name, contact details, address, currency, tax rates)
 * - Inventory management settings (stock thresholds, reorder preferences)
 * - Sales configuration (tax rates, receipt templates, return policies)
 * - Notification preferences (email alerts, reports)
 * - Returns default settings (currently hardcoded, future database storage)
 * - Provides centralized configuration management
 *
 * @default_settings
 * - Business: "My Business", Nepal address, 13% tax rate, USD currency
 * - Inventory: Low stock threshold at 10 units, email notifications enabled
 * - Sales: 13% default tax, 30-day return policy, custom receipt footer
 * - Notifications: Low stock and new order emails enabled, daily reports disabled
 *
 * @business_impact
 * - Centralized configuration management for all business operations
 * - Consistent tax rates and currency across the application
 * - Standardized inventory management thresholds
 * - Unified notification and alert system configuration
 * - Future-proof design for database storage implementation
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects sensitive business configuration data
 * - Prevents unauthorized modification of system behavior
 * - Comprehensive audit logging for configuration access
 *
 * @audit_logging
 * - Logs every settings view with "SYSTEM_SETTINGS_VIEW" action
 * - Tracks access to system configuration data
 * - Records user context and timestamp for compliance
 *
 * @future_enhancements
 * - Database storage for persistent settings
 * - Versioning for settings changes
 * - Environment-specific configurations
 * - Backup and restore functionality for settings
 */
router.get("/system/settings", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, system_controller_1.default.getSystemSettings);
/**
 * @route   PUT /api/system/settings
 * @desc    Update system configuration settings with validation and audit logging
 * @access  Private (Admin & SuperAdmin only - critical system configuration)
 * @body    {
 *   business?: {
 *     name?: string,
 *     email?: string,
 *     phone?: string,
 *     address?: string,
 *     currency?: string,
 *     taxRate?: number
 *   },
 *   inventory?: {
 *     lowStockThreshold?: number,
 *     autoReorder?: boolean,
 *     notifyOnLowStock?: boolean
 *   },
 *   sales?: {
 *     defaultTaxRate?: number,
 *     receiptFooter?: string,
 *     allowReturns?: boolean,
 *     returnPeriodDays?: number
 *   },
 *   notifications?: {
 *     lowStockEmail?: boolean,
 *     newOrderEmail?: boolean,
 *     dailySalesReport?: boolean
 *   }
 * }
 * @returns {
 *   message: string,
 *   updatedSections: string[]
 * }
 *
 * @functionality
 * - Updates system configuration with partial or complete settings
 * - Validates settings structure and allowed sections
 * - Supports partial updates (only provided sections are modified)
 * - Comprehensive validation of input data types and formats
 * - Audit logging with before/after comparison
 * - Returns list of successfully updated sections
 *
 * @validation
 * - Requires authenticated user with admin privileges
 * - Validates settings object structure and data types
 * - Checks for invalid configuration sections
 * - Ensures only allowed settings sections are modified
 * - Future: Database persistence with transaction safety
 *
 * @allowed_sections
 * - "business": Company information, contact details, tax settings
 * - "inventory": Stock management, reorder preferences, notifications
 * - "sales": Tax rates, receipt templates, return policies
 * - "notifications": Email alerts, report preferences
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects critical system configuration from unauthorized changes
 * - Validates all input data to prevent malformed configurations
 * - Comprehensive audit trail for all configuration changes
 *
 * @audit_logging
 * - Logs every settings update with "SYSTEM_SETTINGS_UPDATE" action
 * - Records old and new settings for change tracking
 * - Tracks user context and timestamp for compliance
 * - Provides complete change history for troubleshooting
 *
 * @error_handling
 * - Returns 400 for authentication failures
 * - Returns 400 for invalid settings structure
 * - Returns 400 for unauthorized configuration sections
 * - Returns 500 for internal server errors
 */
router.put("/system/settings", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, system_controller_1.default.updateSystemSettings);
/**
 * @route   GET /api/system/status
 * @desc    Get comprehensive system health status, performance metrics, and operational insights
 * @access  Private (Admin & SuperAdmin only - system monitoring)
 * @returns {
 *   database: {
 *     status: "healthy" | "unhealthy",
 *     responseTime: string,
 *     lastBackup: string
 *   },
 *   metrics: {
 *     activeUsers: number,
 *     activeProducts: number,
 *     salesToday: number,
 *     uptime: number,
 *     memoryUsage: Object
 *   },
 *   recentErrors: Array<{
 *     timestamp: Date,
 *     message: string,
 *     severity: "high" | "medium" | "low"
 *   }>,
 *   lastChecked: Date
 * }
 *
 * @functionality
 * - Comprehensive system health monitoring and status reporting
 * - Database connectivity and performance checks
 * - Business metrics (users, products, daily sales)
 * - System performance indicators (uptime, memory usage)
 * - Error tracking and severity assessment
 * - Real-time system state snapshot
 * - Parallel data collection for optimal performance
 *
 * @health_metrics
 * - Database: Connection status, response time, backup status
 * - Business: Active users, products, 24-hour sales volume
 * - System: Process uptime, memory consumption, error history
 * - Monitoring: Timestamp of last status check
 *
 * @performance_optimizations
 * - Executes 5 parallel checks for comprehensive status assessment
 * - Database health check with raw SQL query
 * - Efficient counting operations for business metrics
 * - System-level performance data from Node.js process
 * - Mock error logging (future: real error tracking)
 *
 * @monitoring_capabilities
 * - Proactive database health monitoring
 * - Business activity tracking and trends
 * - System resource utilization analysis
 * - Error pattern identification and severity assessment
 * - Operational readiness assessment
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects system performance and error information
 * - Prevents exposure of internal system details
 * - Comprehensive audit logging for system monitoring
 *
 * @audit_logging
 * - Logs every status check with "SYSTEM_STATUS_VIEW" action
 * - Tracks system monitoring activities
 * - Records user context for compliance and accountability
 */
router.get("/system/status", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, system_controller_1.default.getSystemStatus);
/**
 * @route   POST /api/system/backup
 * @desc    Initiate system data backup operation with mock implementation
 * @access  Private (Admin & SuperAdmin only - data protection)
 * @returns {
 *   backupId: string,
 *   timestamp: Date,
 *   size: string,
 *   tables: string[],
 *   status: "completed",
 *   downloadUrl: string
 * }
 *
 * @functionality
 * - Initiates system data backup process (currently mock implementation)
 * - Generates unique backup identifier with timestamp
 * - Specifies database tables included in backup
 * - Provides backup metadata (size, status, download URL)
 * - Comprehensive audit logging for backup operations
 * - Returns immediate confirmation with backup details
 *
 * @current_implementation
 * - Mock implementation returning simulated backup information
 * - Includes core business tables: users, products, sales, customers, inventory_logs
 * - Generates realistic backup metadata and download URL
 * - Immediate "completed" status for demonstration
 * - Future: Actual database dump and compression
 *
 * @backup_scope
 * - Users: User accounts, roles, and authentication data
 * - Products: Product catalog, inventory, pricing information
 * - Sales: Transaction history, order details, financial data
 * - Customers: Customer information and contact details
 * - Inventory Logs: Stock movement history and adjustments
 *
 * @future_enhancements
 * - Actual database export and backup file generation
 * - Compression and secure storage management
 * - Cloud storage integration for offsite backups
 * - Backup scheduling and automation
 * - Restore functionality from backup files
 * - Backup verification and integrity checks
 *
 * @security
 * - Restricted to ADMIN and SUPERADMIN roles only
 * - Protects sensitive data backup operations
 * - Prevents unauthorized data export
 * - Comprehensive audit logging for data protection compliance
 *
 * @audit_logging
 * - Logs every backup operation with "SYSTEM_BACKUP_CREATE" action
 * - Tracks backup initiation and completion
 * - Records user context for accountability
 * - Provides audit trail for data protection compliance
 *
 * @business_continuity
 * - Foundation for disaster recovery planning
 * - Data protection and business continuity assurance
 * - Compliance with data retention policies
 * - Support for system migration and upgrades
 */
router.post("/system/backup", auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, system_controller_1.default.backupSystemData);
exports.default = router;
//# sourceMappingURL=system.route.js.map