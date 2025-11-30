"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../../config/prisma"));
const helper_1 = require("../../../globals/helper");
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_helper_1 = require("../utils/user.helper");
const user_types_1 = require("../utils/user.types");
class User {
    async registerUser(req, res) {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            (0, helper_1.sendResponse)(res, 400, "Please provide all required data");
            return;
        }
        const exists = await (0, helper_1.isUserExist)(email);
        if (exists) {
            (0, helper_1.sendResponse)(res, 400, "This email already exist, please use unique email");
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = await prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
            },
        });
        await (0, helper_1.createAuditLog)("SYSTEM", {
            action: "USER_REGISTER",
            description: `New user registered: ${email} with role ${role}`,
            resource: "User",
            resourceId: newUser.id,
            newData: { name, email, role },
        }, req);
        (0, helper_1.sendResponse)(res, 201, "User Created Successfully", newUser);
    }
    async loginUser(req, res) {
        try {
            const { email, password } = req.body;
            // Check if user exists and fetch user data
            const userExists = await (0, helper_1.isUserExist)(email);
            if (!userExists) {
                return (0, helper_1.sendResponse)(res, 404, "No user found with this email");
            }
            // Fetch the actual user from database
            const user = await (0, helper_1.getUserByEmail)(email);
            if (!user) {
                return (0, helper_1.sendResponse)(res, 404, "No user found with this email");
            }
            //Check password
            const isMatch = await bcrypt_1.default.compare(password, user.password);
            console.log(isMatch);
            if (!isMatch) {
                return (0, helper_1.sendResponse)(res, 400, "Incorrect password");
            }
            // Generating tokens
            const accessToken = (0, user_helper_1.generateAccessToken)(user.id, user.role);
            const refreshToken = (0, user_helper_1.generateRefreshToken)(user.id, user.role);
            await prisma_1.default.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });
            await (0, helper_1.createAuditLog)(user.id, {
                action: "USER_LOGIN",
                description: `User logged in successfully`,
                resource: "User",
                resourceId: user.id,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Login successful", {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            });
        }
        catch (err) {
            console.error("Login error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async getAllUser(req, res) {
        try {
            // Get pagination parameters from query
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            // Fetch users with pagination
            const [users, totalCount] = await Promise.all([
                prisma_1.default.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                prisma_1.default.user.count(),
            ]);
            if (!users || users.length === 0) {
                return (0, helper_1.sendResponse)(res, 404, "No users found");
            }
            return (0, helper_1.sendResponse)(res, 200, "Users retrieved successfully", {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalUsers: totalCount,
                    limit,
                },
            });
        }
        catch (err) {
            console.error("Get all users error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            // Validate if id is provided
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            // Fetch user by ID
            const user = await prisma_1.default.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    // Exclude password from response
                },
            });
            // Check if user exists
            if (!user) {
                return (0, helper_1.sendResponse)(res, 404, "User not found");
            }
            return (0, helper_1.sendResponse)(res, 200, "User retrieved successfully", { user });
        }
        catch (err) {
            console.error("Get user by ID error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async assignUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const userId = req.user?.id;
            // Validate inputs
            if (!id || !role) {
                return (0, helper_1.sendResponse)(res, 400, "User ID and role are required");
            }
            const existingUser = await prisma_1.default.user.findUnique({
                where: { id },
            });
            if (!existingUser) {
                return (0, helper_1.sendResponse)(res, 404, "User not found");
            }
            const oldRole = existingUser.role;
            // Update user role
            const updatedUser = await prisma_1.default.user.update({
                where: { id },
                data: { role },
            });
            await (0, helper_1.createAuditLog)(userId || "SYSTEM", {
                action: "USER_ROLE_UPDATE",
                description: `Changed user role from ${oldRole} to ${role}`,
                resource: "User",
                resourceId: id,
                oldData: { role: oldRole },
                newData: { role },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "User role updated successfully", {
                updatedUser,
            });
        }
        catch (error) {
            console.error("Assign user role error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async deactivateUser(req, res) {
        try {
            const { id } = req.params;
            // Validate inputs
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            // Deactivate user
            const updatedUser = await prisma_1.default.user.update({
                where: { id },
                data: { isActive: false },
            });
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "USER_DEACTIVATE",
                description: `Deactivated user account`,
                resource: "User",
                resourceId: id,
                oldData: { isActive: true },
                newData: { isActive: false },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "User deactivated successfully", {
                updatedUser,
            });
        }
        catch (error) {
            console.error("Deactivate user error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async activateUser(req, res) {
        try {
            const { id } = req.params;
            // Validate inputs
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            // Activate user
            const updatedUser = await prisma_1.default.user.update({
                where: { id },
                data: { isActive: true },
            });
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "USER_ACTIVATE",
                description: `Reactivated user account`,
                resource: "User",
                resourceId: id,
                oldData: { isActive: false },
                newData: { isActive: true },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "User activated successfully", {
                updatedUser,
            });
        }
        catch (error) {
            console.error("Activate user error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async getAllAdmins(req, res) {
        try {
            const { page = "1", limit = "10", role, search, } = req.query;
            // Parse pagination parameters with validation
            const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
            const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10; // Cap at 100 for performance
            const skip = (pageNumber - 1) * limitNumber;
            // Build where clause dynamically
            const whereClause = {
                OR: [{ role: "ADMIN" }, { role: "SUPERADMIN" }],
            };
            // Add role filter if specified
            if (role && ["ADMIN", "SUPERADMIN"].includes(role.toUpperCase())) {
                whereClause.OR = [{ role: role.toUpperCase() }];
            }
            // Add search filter if provided
            if (search && search.trim()) {
                whereClause.OR = whereClause.OR.map((roleCondition) => ({
                    ...roleCondition,
                    OR: [
                        { name: { contains: search.trim(), mode: "insensitive" } },
                        { email: { contains: search.trim(), mode: "insensitive" } },
                    ],
                }));
            }
            // Execute queries in parallel for better performance
            const [admins, totalCount] = await Promise.all([
                // Get paginated admins
                prisma_1.default.user.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: [
                        { role: "desc" }, // SUPERADMIN comes first (alphabetical order)
                        { createdAt: "desc" },
                    ],
                    skip,
                    take: limitNumber,
                }),
                // Get total count for pagination
                prisma_1.default.user.count({
                    where: whereClause,
                }),
            ]);
            // Handle no results
            if (!admins || admins.length === 0) {
                return (0, helper_1.sendResponse)(res, 404, "No admins found");
            }
            // Group admins by role
            const groupedAdmins = admins.reduce((acc, admin) => {
                const role = admin.role;
                if (!acc[role]) {
                    acc[role] = [];
                }
                acc[role].push(admin);
                return acc;
            }, {});
            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limitNumber);
            const paginationInfo = {
                page: pageNumber,
                limit: limitNumber,
                total: totalCount,
                totalPages,
                hasNext: pageNumber < totalPages,
                hasPrev: pageNumber > 1,
            };
            return (0, helper_1.sendResponse)(res, 200, "Admins retrieved successfully", {
                admins: groupedAdmins,
                pagination: paginationInfo,
            });
        }
        catch (err) {
            console.error("Get all admins error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async demoteToCustomer(req, res) {
        try {
            const { id } = req.params;
            // Validate inputs
            if (!id) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            const existingUser = await prisma_1.default.user.findUnique({
                where: { id },
            });
            // Demote admin to regular user
            const updatedUser = await prisma_1.default.user.update({
                where: { id },
                data: { role: "CUSTOMER" },
            });
            if (!existingUser) {
                return (0, helper_1.sendResponse)(res, 404, "User not found");
            }
            const oldRole = existingUser.role;
            await (0, helper_1.createAuditLog)(req.user?.id || "SYSTEM", {
                action: "USER_DEMOTE",
                description: `Demoted user from ${oldRole} to CUSTOMER`,
                resource: "User",
                resourceId: id,
                oldData: { role: oldRole },
                newData: { role: "CUSTOMER" },
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Admin demoted successfully", {
                updatedUser,
            });
        }
        catch (error) {
            console.error("Demote admin error:", error);
            return (0, helper_1.sendResponse)(res, 500, "Something went wrong");
        }
    }
    async getProfile(req, res) {
        try {
            const { userId } = req.params;
            const { page = "1", limit = "10" } = req.query;
            // Validate userId
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 400, "User ID is required");
            }
            // Parse pagination with limits
            const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
            const limitNumber = Math.max(1, Math.min(50, parseInt(limit, 10))) || 10;
            const skip = (pageNumber - 1) * limitNumber;
            // Fetch user profile and recent activity in parallel for optimal performance
            const [user, recentSales, recentInventoryLogs, salesCount, inventoryCount,] = await Promise.all([
                // User basic info
                prisma_1.default.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                        lastLogin: true,
                    },
                }),
                // Recent sales (last 30 days)
                prisma_1.default.sale.findMany({
                    where: {
                        staffId: userId,
                        createdAt: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                        },
                    },
                    select: {
                        id: true,
                        saleNumber: true,
                        totalAmount: true,
                        finalAmount: true,
                        paymentMethod: true,
                        status: true,
                        createdAt: true,
                        customer: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limitNumber,
                }),
                // Recent inventory logs (last 30 days)
                prisma_1.default.inventoryLog.findMany({
                    where: {
                        performedById: userId,
                        createdAt: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                        },
                    },
                    select: {
                        id: true,
                        type: true,
                        quantity: true,
                        previousStock: true,
                        newStock: true,
                        reason: true,
                        createdAt: true,
                        product: {
                            select: {
                                name: true,
                                sku: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limitNumber,
                }),
                // Sales count for pagination
                prisma_1.default.sale.count({
                    where: {
                        staffId: userId,
                        createdAt: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                    },
                }),
                // Inventory logs count for pagination
                prisma_1.default.inventoryLog.count({
                    where: {
                        performedById: userId,
                        createdAt: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                    },
                }),
            ]);
            // Check if user exists
            if (!user) {
                return (0, helper_1.sendResponse)(res, 404, "User not found");
            }
            // Calculate pagination info
            const totalPagesSales = Math.ceil(salesCount / limitNumber);
            const totalPagesInventory = Math.ceil(inventoryCount / limitNumber);
            const salesPagination = {
                page: pageNumber,
                limit: limitNumber,
                total: salesCount,
                totalPages: totalPagesSales,
                hasNext: pageNumber < totalPagesSales,
                hasPrev: pageNumber > 1,
            };
            const inventoryPagination = {
                page: pageNumber,
                limit: limitNumber,
                total: inventoryCount,
                totalPages: totalPagesInventory,
                hasNext: pageNumber < totalPagesInventory,
                hasPrev: pageNumber > 1,
            };
            // Build response
            const response = {
                user,
                recentActivity: {
                    sales: recentSales,
                    inventoryLogs: recentInventoryLogs,
                    pagination: salesPagination, // Using sales pagination as primary
                },
            };
            return (0, helper_1.sendResponse)(res, 200, "User profile retrieved successfully", response);
        }
        catch (err) {
            console.error("Get profile error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async getUserByRole(req, res) {
        try {
            const { role } = req.params;
            const { page = "1", limit = "10", search, isActive, } = req.query;
            if (!role) {
                return (0, helper_1.sendResponse)(res, 400, "Role parameter is required");
            }
            const validRoles = Object.values(user_types_1.UserRole);
            if (!validRoles.includes(role)) {
                return (0, helper_1.sendResponse)(res, 400, `Invalid role. Valid roles are: ${validRoles.join(", ")}`);
            }
            const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
            const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10;
            const skip = (pageNumber - 1) * limitNumber;
            const whereClause = { role };
            if (search && search.trim()) {
                whereClause.OR = [
                    { name: { contains: search.trim(), mode: "insensitive" } },
                    { email: { contains: search.trim(), mode: "insensitive" } },
                ];
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive === "true";
            }
            // Execute parallel queries for optimal performance
            const [users, totalCount] = await Promise.all([
                // Get paginated users
                prisma_1.default.user.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                        lastLogin: true,
                    },
                    orderBy: [
                        { createdAt: "desc" }, // Newest first
                        { name: "asc" }, // Alphabetical as secondary sort
                    ],
                    skip,
                    take: limitNumber,
                }),
                prisma_1.default.user.count({ where: whereClause }),
            ]);
            if (users.length === 0) {
                return (0, helper_1.sendResponse)(res, 404, `No users found with role '${role}'`);
            }
            const totalPages = Math.ceil(totalCount / limitNumber);
            const paginationInfo = {
                page: pageNumber,
                limit: limitNumber,
                total: totalCount,
                totalPages,
                hasNext: pageNumber < totalPages,
                hasPrev: pageNumber > 1,
            };
            return (0, helper_1.sendResponse)(res, 200, "Users retrieved successfully", {
                users,
                pagination: paginationInfo,
            });
        }
        catch (err) {
            console.error("Get users by role error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id; // From auth middleware
            const { name, email } = req.body;
            if (!userId) {
                return (0, helper_1.sendResponse)(res, 401, "Authentication required");
            }
            const updateData = {};
            if (name !== undefined)
                updateData.name = name.trim();
            if (email !== undefined)
                updateData.email = email.trim().toLowerCase();
            if (Object.keys(updateData).length === 0) {
                return (0, helper_1.sendResponse)(res, 400, "No valid fields to update");
            }
            if (updateData.email) {
                const existingUser = await prisma_1.default.user.findUnique({
                    where: { email: updateData.email },
                    select: { id: true },
                });
                if (existingUser && existingUser.id !== userId) {
                    return (0, helper_1.sendResponse)(res, 409, "Email already exists");
                }
            }
            const oldUserData = await prisma_1.default.user.findUnique({
                where: { id: userId },
            });
            const updatedUser = await prisma_1.default.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            await (0, helper_1.createAuditLog)(userId, {
                action: "PROFILE_UPDATE",
                description: `Updated profile information`,
                resource: "User",
                resourceId: userId,
                oldData: oldUserData, // fetch before update
                newData: updateData,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Profile updated successfully", {
                user: updatedUser,
            });
        }
        catch (err) {
            console.error("Update profile error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async searchUsers(req, res) {
        try {
            const { page = "1", limit = "10", search, role, isActive, startDate, endDate, sortBy = "createdAt", sortOrder = "desc", } = req.query;
            // Parse pagination
            const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
            const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10;
            const skip = (pageNumber - 1) * limitNumber;
            const whereClause = {};
            if (search && search.trim()) {
                const searchTerm = search.trim();
                whereClause.OR = [
                    { name: { contains: searchTerm, mode: "insensitive" } },
                    { email: { contains: searchTerm, mode: "insensitive" } },
                ];
            }
            if (role && Object.values(user_types_1.UserRole).includes(role)) {
                whereClause.role = role;
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive === "true";
            }
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate)
                    whereClause.createdAt.gte = new Date(startDate);
                if (endDate)
                    whereClause.createdAt.lte = new Date(endDate);
            }
            const validSortFields = [
                "name",
                "email",
                "role",
                "createdAt",
                "updatedAt",
            ];
            const sortField = validSortFields.includes(sortBy)
                ? sortBy
                : "createdAt";
            const order = sortOrder === "asc" ? "asc" : "desc";
            const [users, totalCount] = await Promise.all([
                prisma_1.default.user.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                        lastLogin: true,
                    },
                    orderBy: { [sortField]: order },
                    skip,
                    take: limitNumber,
                }),
                prisma_1.default.user.count({ where: whereClause }),
            ]);
            const totalPages = Math.ceil(totalCount / limitNumber);
            const paginationInfo = {
                page: pageNumber,
                limit: limitNumber,
                total: totalCount,
                totalPages,
                hasNext: pageNumber < totalPages,
                hasPrev: pageNumber > 1,
            };
            return (0, helper_1.sendResponse)(res, 200, "Users search completed", {
                users,
                pagination: paginationInfo,
                filters: { search, role, isActive, startDate, endDate },
            });
        }
        catch (err) {
            console.error("Search users error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
    async logout(req, res) {
        try {
            const userId = req.user?.id;
            const token = req.headers.authorization?.replace("Bearer ", "");
            if (!userId || !token) {
                return (0, helper_1.sendResponse)(res, 401, "Authentication required");
            }
            await Promise.all([
                // Invalidate the specific token
                prisma_1.default.refreshToken.updateMany({
                    where: {
                        token: token,
                        userId: userId,
                        isRevoked: false,
                    },
                    data: { isRevoked: true },
                }),
                prisma_1.default.user.update({
                    where: { id: userId },
                    data: { lastLogin: new Date() },
                }),
            ]);
            await (0, helper_1.createAuditLog)(userId, {
                action: "USER_LOGOUT",
                description: `User logged out`,
                resource: "User",
                resourceId: userId,
            }, req);
            return (0, helper_1.sendResponse)(res, 200, "Logged out successfully");
        }
        catch (err) {
            console.error("Logout error:", err);
            return (0, helper_1.sendResponse)(res, 500, "Internal server error");
        }
    }
}
exports.default = new User();
//# sourceMappingURL=user.controller.js.map