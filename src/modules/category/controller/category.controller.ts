import { Request, Response } from "express";
import { sendResponse } from "../../../globals/helper";
import { AuthRequest } from "../../../middleware/auth.middleware";
import prisma from "../../../config/prisma";
import { Prisma } from "../../../generated/prisma";

class CategoryController {
  async createCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, description } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!name?.trim()) {
        return sendResponse(res, 400, "Category name is required");
      }

      if (!description?.trim()) {
        return sendResponse(res, 400, "Category description is required");
      }

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: "insensitive",
          },
        },
      });

      if (existingCategory) {
        return sendResponse(res, 409, "Category with this name already exists");
      }

      // Create new category
      const newCategory = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          createdById: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return sendResponse(
        res,
        201,
        "Category created successfully",
        newCategory
      );
    } catch (error) {
      console.error("Create category error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return sendResponse(
            res,
            409,
            "Category with this name already exists"
          );
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  // Get all categories
  async getCategories(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        isActive,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Cap at 100 for performance
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.CategoryWhereInput = {};

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      if (search) {
        where.OR = [
          {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        ];
      }

      // Execute queries in parallel for better performance
      const [categories, totalCount] = await Promise.all([
        prisma.category.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: {
            [sortBy as string]: sortOrder,
          },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.category.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const responseData = {
        categories,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext,
          hasPrev,
          limit: limitNum,
        },
      };

      return sendResponse(
        res,
        200,
        "Categories retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get categories error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getCategoryById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return sendResponse(res, 400, "Category ID is required");
      }

      const category = await prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          products: {
            where: { isActive: true },
            take: 10, // Limit products to prevent over-fetching
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
              status: true,
            },
          },
        },
      });

      if (!category) {
        return sendResponse(res, 404, "Category not found");
      }

      return sendResponse(
        res,
        200,
        "Category retrieved successfully",
        category
      );
    } catch (error) {
      console.error("Get category by ID error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async updateCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      const userId = req.user?.id;

      if (!id) {
        return sendResponse(res, 400, "id is required");
      }

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return sendResponse(res, 404, "Category not found");
      }

      // Check for duplicate name
      if (name && name !== existingCategory.name) {
        const duplicateCategory = await prisma.category.findFirst({
          where: {
            name: {
              equals: name.trim(),
              mode: "insensitive",
            },
            id: { not: id },
          },
        });

        if (duplicateCategory) {
          return sendResponse(
            res,
            409,
            "Category with this name already exists"
          );
        }
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description && { description: description.trim() }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return sendResponse(
        res,
        200,
        "Category updated successfully",
        updatedCategory
      );
    } catch (error) {
      console.error("Update category error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Category not found");
        }
        if (error.code === "P2002") {
          return sendResponse(
            res,
            409,
            "Category with this name already exists"
          );
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  // Soft delete or Deactivated category
  async deleteCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return sendResponse(res, 400, "Id is missing");
      }
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      // Check if category exists and has products
      const categoryWithProducts = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      if (!categoryWithProducts) {
        return sendResponse(res, 404, "Category not found");
      }

      if (categoryWithProducts.products.length > 0) {
        return sendResponse(
          res,
          400,
          "Cannot delete category with active products"
        );
      }

      // Soft delete by setting isActive to false
      await prisma.category.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return sendResponse(res, 200, "Category deleted successfully");
    } catch (error) {
      console.error("Delete category error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Category not found");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  // For minimal Overview data of category

  async getCategoriesMinimal(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              products: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return sendResponse(
        res,
        200,
        "Categories retrieved successfully",
        categories
      );
    } catch (error) {
      console.error("Get minimal categories error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  //  Activate or deactivate category

  async activateCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const userId = req.user?.id;

      if (!id) {
        return sendResponse(res, 400, "Category ID is required");
      }
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      if (typeof isActive !== "boolean") {
        return sendResponse(res, 400, "isActive must be a boolean value");
      }

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
          isActive: true,
          name: true,
        },
      });

      if (!existingCategory) {
        return sendResponse(res, 404, "Category not found");
      }

      // No change needed if already in desired state
      if (existingCategory.isActive === isActive) {
        const message = isActive
          ? "Category is already active"
          : "Category is already deactivated";
        return sendResponse(res, 200, message, {
          id: existingCategory.id,
          name: existingCategory.name,
          isActive,
        });
      }

      // Update category active status
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          isActive,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      const message = isActive
        ? "Category activated successfully"
        : "Category deactivated successfully";
      return sendResponse(res, 200, message, updatedCategory);
    } catch (error) {
      console.error("Activate category error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Category not found");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  // Search categories with filtering and pagination

  async searchCategories(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        q: searchQuery,
        page = 1,
        limit = 20,
        sortBy = "relevance",
        sortOrder = "desc",
        isActive,
        includeProducts = "false",
      } = req.query;

      // Validate search query
      if (!searchQuery?.toString().trim()) {
        return sendResponse(res, 400, "Search query is required");
      }

      const searchTerm = searchQuery.toString().trim();

      // Validate search term length
      if (searchTerm.length < 2) {
        return sendResponse(
          res,
          400,
          "Search term must be at least 2 characters long"
        );
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string))); // More conservative limit for search
      const skip = (pageNum - 1) * limitNum;

      // Build where clause with search relevance
      const where: Prisma.CategoryWhereInput = {};

      // Active filter
      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      // Search conditions with relevance scoring
      where.OR = [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];

      let orderBy: Prisma.CategoryOrderByWithRelationInput = {};

      if (sortBy === "relevance") {
        // Basic relevance scoring: exact match in name first, then description
        // orderBy = [
        //   {
        //     // Prioritize exact name matches
        //     _relevance: {
        //       fields: ["name"],
        //       search: searchTerm,
        //       sort: "desc",
        //     },
        //   },
        //   {
        //     // Then by description matches
        //     _relevance: {
        //       fields: ["description"],
        //       search: searchTerm,
        //       sort: "desc",
        //     },
        //   },
        //   {
        //     // Finally by creation date
        //     createdAt: "desc",
        //   },
        // ];
        orderBy = {
          //   createdAt: "desc",
          name: "asc",
        };
      } else {
        orderBy = {
          [sortBy as string]: sortOrder,
        };
      }

      // Base select fields
      const selectFields: Prisma.CategorySelect = {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      };

      // Conditionally include products count with active filter
      if (includeProducts === "true") {
        selectFields._count = {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        };
      }

      // Execute parallel queries for better performance
      const [categories, totalCount, exactMatch] = await Promise.all([
        // Main search results
        prisma.category.findMany({
          where,
          skip,
          take: limitNum,
          orderBy,
          select: selectFields,
        }),

        // Total count for pagination
        prisma.category.count({ where }),

        // Check for exact match (useful for suggestions)
        prisma.category.findFirst({
          where: {
            name: {
              equals: searchTerm,
              mode: "insensitive",
            },
            ...(isActive !== undefined
              ? { isActive: isActive === "true" }
              : {}),
          },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const responseData = {
        categories,
        searchMeta: {
          query: searchTerm,
          totalResults: totalCount,
          exactMatch: exactMatch
            ? {
                id: exactMatch.id,
                name: exactMatch.name,
              }
            : null,
          suggestions:
            totalCount === 0
              ? await this.generateSearchSuggestions(searchTerm)
              : [],
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          hasNext,
          hasPrev,
          limit: limitNum,
        },
      };

      return sendResponse(
        res,
        200,
        "Search completed successfully",
        responseData
      );
    } catch (error) {
      console.error("Search categories error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  /**
   * Generate search suggestions when no results found
   */
  private async generateSearchSuggestions(
    searchTerm: string
  ): Promise<string[]> {
    try {
      // Find similar category names for suggestions
      const similarCategories = await prisma.category.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchTerm.substring(0, 3), // Partial match for suggestions
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          name: true,
        },
        take: 5,
        orderBy: {
          name: "asc",
        },
      });

      return similarCategories.map((cat) => cat.name);
    } catch (error) {
      console.error("Generate suggestions error:", error);
      return [];
    }
  }
}

export default new CategoryController();
