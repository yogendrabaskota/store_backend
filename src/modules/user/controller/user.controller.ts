import { Request, Response } from "express";
import prisma from "../../../config/prisma";
import {
  getUserByEmail,
  isUserExist,
  sendResponse,
} from "../../../globals/helper";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/user.helper";
import { AuthRequest } from "../../../middleware/auth.middleware";
import {
  AdminPaginationInfo,
  GetAllAdminsQuery,
  GetProfileParams,
  GetUsersByRoleParams,
  ProfilePaginationInfo,
  ProfilePaginationQuery,
  RoleWhereCOndition,
  UserProfileResponse,
  UserRole,
  UsersByRoleQuery,
} from "../utils/user.types";
class User {
  async registerUser(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      sendResponse(res, 400, "Please provide all required data");
      return;
    }
    const exists = await isUserExist(email);
    if (exists) {
      sendResponse(
        res,
        400,
        "This email already exist, please use unique email"
      );
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
      },
    });
    sendResponse(res, 201, "User Created Successfully", newUser);
  }

  async loginUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Check if user exists and fetch user data
      const userExists = await isUserExist(email);
      if (!userExists) {
        return sendResponse(res, 404, "No user found with this email");
      }

      // Fetch the actual user from database
      const user = await getUserByEmail(email);
      if (!user) {
        return sendResponse(res, 404, "No user found with this email");
      }

      //Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return sendResponse(res, 400, "Incorrect password");
      }

      // Generating tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return sendResponse(res, 200, "Login successful", {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Login error:", err);
      return sendResponse(res, 500, "Something went wrong");
    }
  }

  async getAllUser(req: Request, res: Response): Promise<Response> {
    try {
      // Get pagination parameters from query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Fetch users with pagination
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
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
        prisma.user.count(),
      ]);

      if (!users || users.length === 0) {
        return sendResponse(res, 404, "No users found");
      }

      return sendResponse(res, 200, "Users retrieved successfully", {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalUsers: totalCount,
          limit,
        },
      });
    } catch (err) {
      console.error("Get all users error:", err);
      return sendResponse(res, 500, "Something went wrong");
    }
  }

  async getUserById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      // Validate if id is provided
      if (!id) {
        return sendResponse(res, 400, "User ID is required");
      }

      // Fetch user by ID
      const user = await prisma.user.findUnique({
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
        return sendResponse(res, 404, "User not found");
      }

      return sendResponse(res, 200, "User retrieved successfully", { user });
    } catch (err) {
      console.error("Get user by ID error:", err);
      return sendResponse(res, 500, "Something went wrong");
    }
  }

  async assignUserRole(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validate inputs
      if (!id || !role) {
        return sendResponse(res, 400, "User ID and role are required");
      }
      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
      });
      return sendResponse(res, 200, "User role updated successfully", {
        updatedUser,
      });
    } catch (error) {
      console.error("Assign user role error:", error);
      return sendResponse(res, 500, "Something went wrong");
    }
  }
  async deactivateUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Validate inputs
      if (!id) {
        return sendResponse(res, 400, "User ID is required");
      }
      // Deactivate user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return sendResponse(res, 200, "User deactivated successfully", {
        updatedUser,
      });
    } catch (error) {
      console.error("Deactivate user error:", error);
      return sendResponse(res, 500, "Something went wrong");
    }
  }
  async activateUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Validate inputs
      if (!id) {
        return sendResponse(res, 400, "User ID is required");
      }
      // Activate user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: true },
      });
      return sendResponse(res, 200, "User activated successfully", {
        updatedUser,
      });
    } catch (error) {
      console.error("Activate user error:", error);
      return sendResponse(res, 500, "Something went wrong");
    }
  }

  async getAllAdmins(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = "1",
        limit = "10",
        role,
        search,
      } = req.query as GetAllAdminsQuery;

      // Parse pagination parameters with validation
      const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
      const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10; // Cap at 100 for performance
      const skip = (pageNumber - 1) * limitNumber;

      // Build where clause dynamically
      const whereClause: any = {
        OR: [{ role: "ADMIN" }, { role: "SUPERADMIN" }],
      };

      // Add role filter if specified
      if (role && ["ADMIN", "SUPERADMIN"].includes(role.toUpperCase())) {
        whereClause.OR = [{ role: role.toUpperCase() }];
      }

      // Add search filter if provided
      if (search && search.trim()) {
        whereClause.OR = whereClause.OR.map(
          (roleCondition: RoleWhereCOndition) => ({
            ...roleCondition,
            OR: [
              { name: { contains: search.trim(), mode: "insensitive" } },
              { email: { contains: search.trim(), mode: "insensitive" } },
            ],
          })
        );
      }

      // Execute queries in parallel for better performance
      const [admins, totalCount] = await Promise.all([
        // Get paginated admins
        prisma.user.findMany({
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
        prisma.user.count({
          where: whereClause,
        }),
      ]);

      // Handle no results
      if (!admins || admins.length === 0) {
        return sendResponse(res, 404, "No admins found");
      }

      // Group admins by role
      const groupedAdmins = admins.reduce((acc, admin) => {
        const role = admin.role as "ADMIN" | "SUPERADMIN";
        if (!acc[role]) {
          acc[role] = [];
        }
        acc[role].push(admin);
        return acc;
      }, {} as Record<"ADMIN" | "SUPERADMIN", typeof admins>);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limitNumber);
      const paginationInfo: AdminPaginationInfo = {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
      };

      return sendResponse(res, 200, "Admins retrieved successfully", {
        admins: groupedAdmins,
        pagination: paginationInfo,
      });
    } catch (err) {
      console.error("Get all admins error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async demoteToCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Validate inputs
      if (!id) {
        return sendResponse(res, 400, "User ID is required");
      }
      // Demote admin to regular user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role: "CUSTOMER" },
      });
      return sendResponse(res, 200, "Admin demoted successfully", {
        updatedUser,
      });
    } catch (error) {
      console.error("Demote admin error:", error);
      return sendResponse(res, 500, "Something went wrong");
    }
  }
  async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { page = "1", limit = "10" } = req.query as ProfilePaginationQuery;

      // Validate userId
      if (!userId) {
        return sendResponse(res, 400, "User ID is required");
      }

      // Parse pagination with limits
      const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
      const limitNumber = Math.max(1, Math.min(50, parseInt(limit, 10))) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch user profile and recent activity in parallel for optimal performance
      const [
        user,
        recentSales,
        recentInventoryLogs,
        salesCount,
        inventoryCount,
      ] = await Promise.all([
        // User basic info
        prisma.user.findUnique({
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
        prisma.sale.findMany({
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
        prisma.inventoryLog.findMany({
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
        prisma.sale.count({
          where: {
            staffId: userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Inventory logs count for pagination
        prisma.inventoryLog.count({
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
        return sendResponse(res, 404, "User not found");
      }

      // Calculate pagination info
      const totalPagesSales = Math.ceil(salesCount / limitNumber);
      const totalPagesInventory = Math.ceil(inventoryCount / limitNumber);

      const salesPagination: ProfilePaginationInfo = {
        page: pageNumber,
        limit: limitNumber,
        total: salesCount,
        totalPages: totalPagesSales,
        hasNext: pageNumber < totalPagesSales,
        hasPrev: pageNumber > 1,
      };

      const inventoryPagination: ProfilePaginationInfo = {
        page: pageNumber,
        limit: limitNumber,
        total: inventoryCount,
        totalPages: totalPagesInventory,
        hasNext: pageNumber < totalPagesInventory,
        hasPrev: pageNumber > 1,
      };

      // Build response
      const response: UserProfileResponse = {
        user,
        recentActivity: {
          sales: recentSales,
          inventoryLogs: recentInventoryLogs,
          pagination: salesPagination, // Using sales pagination as primary
        },
      };

      return sendResponse(
        res,
        200,
        "User profile retrieved successfully",
        response
      );
    } catch (err) {
      console.error("Get profile error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getUserByRole(req: Request, res: Response): Promise<Response> {
    try {
      const { role } = req.params as unknown as GetUsersByRoleParams;

      const {
        page = "1",
        limit = "10",
        search,
        isActive,
      } = req.query as UsersByRoleQuery;

      if (!role) {
        return sendResponse(res, 400, "Role parameter is required");
      }

      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(role as UserRole)) {
        return sendResponse(
          res,
          400,
          `Invalid role. Valid roles are: ${validRoles.join(", ")}`
        );
      }

      const pageNumber = Math.max(1, parseInt(page, 10)) || 1;
      const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const whereClause: any = { role };

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
        prisma.user.findMany({
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

        prisma.user.count({ where: whereClause }),
      ]);

      if (users.length === 0) {
        return sendResponse(res, 404, `No users found with role '${role}'`);
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

      return sendResponse(res, 200, "Users retrieved successfully", {
        users,
        pagination: paginationInfo,
      });
    } catch (err) {
      console.error("Get users by role error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id; // From auth middleware
      const { name, email } = req.body;

      if (!userId) {
        return sendResponse(res, 401, "Authentication required");
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email.trim().toLowerCase();

      if (Object.keys(updateData).length === 0) {
        return sendResponse(res, 400, "No valid fields to update");
      }

      if (updateData.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: updateData.email },
          select: { id: true },
        });

        if (existingUser && existingUser.id !== userId) {
          return sendResponse(res, 409, "Email already exists");
        }
      }

      const updatedUser = await prisma.user.update({
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

      return sendResponse(res, 200, "Profile updated successfully", {
        user: updatedUser,
      });
    } catch (err) {
      console.error("Update profile error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async searchUsers(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = "1",
        limit = "10",
        search,
        role,
        isActive,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Parse pagination
      const pageNumber = Math.max(1, parseInt(page as string, 10)) || 1;
      const limitNumber =
        Math.max(1, Math.min(100, parseInt(limit as string, 10))) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const whereClause: any = {};

      if (search && (search as string).trim()) {
        const searchTerm = (search as string).trim();
        whereClause.OR = [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      if (role && Object.values(UserRole).includes(role as UserRole)) {
        whereClause.role = role;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate)
          whereClause.createdAt.gte = new Date(startDate as string);
        if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
      }

      const validSortFields = [
        "name",
        "email",
        "role",
        "createdAt",
        "updatedAt",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "createdAt";
      const order = sortOrder === "asc" ? "asc" : "desc";

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
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
          orderBy: { [sortField as string]: order },
          skip,
          take: limitNumber,
        }),
        prisma.user.count({ where: whereClause }),
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

      return sendResponse(res, 200, "Users search completed", {
        users,
        pagination: paginationInfo,
        filters: { search, role, isActive, startDate, endDate },
      });
    } catch (err) {
      console.error("Search users error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!userId || !token) {
        return sendResponse(res, 401, "Authentication required");
      }

      await Promise.all([
        // Invalidate the specific token
        prisma.refreshToken.updateMany({
          where: {
            token: token,
            userId: userId,
            isRevoked: false,
          },
          data: { isRevoked: true },
        }),

        prisma.user.update({
          where: { id: userId },
          data: { lastLogin: new Date() },
        }),
      ]);

      return sendResponse(res, 200, "Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new User();
