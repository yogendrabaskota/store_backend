import { Response } from "express";
import prisma from "../../../config/prisma";
import { sendResponse } from "../../../globals/helper";
import { AuthRequest } from "../../../middleware/auth.middleware";
import {
  InventoryLogType,
  Prisma,
  ProductStatus,
} from "../../../generated/prisma";

class ProductController {
  async createProduct(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        name,
        description,
        price,
        costPrice,
        sku,
        barcode,
        quantity,
        minStock,
        maxStock,
        categoryId,
        imageUrl,
        weight,
        dimensions,
      } = req.body;

      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }

      const requiredFields = [
        "name",
        "price",
        "costPrice",
        "sku",
        "categoryId",
      ];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return sendResponse(
          res,
          400,
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      if (parseFloat(price) <= 0 || parseFloat(costPrice) <= 0) {
        return sendResponse(
          res,
          400,
          "Price and cost price must be greater than 0"
        );
      }

      // Check for unique constraints
      const [existingSku, existingBarcode, category] = await Promise.all([
        prisma.product.findUnique({ where: { sku } }),
        barcode ? prisma.product.findUnique({ where: { barcode } }) : null,
        prisma.category.findFirst({
          where: {
            id: categoryId,
            isActive: true,
          },
        }),
      ]);

      if (existingSku) {
        return sendResponse(res, 409, "Product with this SKU already exists");
      }

      if (existingBarcode) {
        return sendResponse(
          res,
          409,
          "Product with this barcode already exists"
        );
      }

      if (!category) {
        return sendResponse(res, 404, "Category not found or inactive");
      }

      // Create product
      const newProduct = await prisma.product.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          price,
          costPrice,
          sku: sku.trim(),
          barcode: barcode?.trim(),
          quantity: quantity || 0,
          minStock: minStock || 10,
          maxStock: maxStock || 100,
          categoryId,
          createdById: userId,
          imageUrl,
          weight,
          dimensions,
        },
        select: this.getProductSelectFields(),
      });

      // Create inventory log for initial stock
      if (quantity > 0) {
        await prisma.inventoryLog.create({
          data: {
            type: "STOCK_IN",
            quantity,
            previousStock: 0,
            newStock: quantity,
            reason: "Initial stock",
            productId: newProduct.id,
            performedById: userId,
          },
        });
      }

      return sendResponse(res, 201, "Product created successfully", newProduct);
    } catch (error) {
      console.error("Create product error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const field = error.meta?.target as string;
          return sendResponse(
            res,
            409,
            `Product with this ${field} already exists`
          );
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getProducts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        categoryId,
        status,
        isActive = "true",
        minPrice,
        maxPrice,
        lowStock,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        isActive: isActive === "true",
      };

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { description: { contains: search as string, mode: "insensitive" } },
          { sku: { contains: search as string, mode: "insensitive" } },
          { barcode: { contains: search as string, mode: "insensitive" } },
        ];
      }

      // Category filter
      if (categoryId) {
        where.categoryId = categoryId as string;
      }

      // Status filter
      if (status) {
        where.status = status as ProductStatus;
      }

      // Price range filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = new Prisma.Decimal(minPrice as string);
        if (maxPrice) where.price.lte = new Prisma.Decimal(maxPrice as string);
      }

      // Execute main queries in parallel
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
          select: this.getProductSelectFields(),
        }),

        prisma.product.count({ where }),
      ]);

      // ✅ JS-based low-stock filtering (Solution 1)
      const lowStockProducts = products.filter((p) => p.quantity <= p.minStock);

      const lowStockCount =
        lowStock === "true"
          ? lowStockProducts.length
          : await prisma.product.count({
              where: {
                ...where,
                quantity: 0,
              },
            });

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        products:
          lowStock === "true"
            ? lowStockProducts // return only low-stock items when filtered
            : products,

        summary: {
          totalCount,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: await prisma.product.count({
            where: { ...where, quantity: 0 },
          }),
        },

        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      };

      return sendResponse(
        res,
        200,
        "Products retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get products error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  private getProductSelectFields(
    minimal: boolean = false
  ): Prisma.ProductSelect {
    const baseFields = {
      id: true,
      name: true,
      description: true,
      price: true,
      costPrice: true,
      sku: true,
      barcode: true,
      quantity: true,
      minStock: true,
      maxStock: true,
      status: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      imageUrl: true,
      weight: true,
      dimensions: true,
    };

    if (minimal) {
      return baseFields;
    }

    return {
      ...baseFields,
      category: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          saleItems: true,
          inventoryLogs: true,
        },
      },
    };
  }

  async getProductById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return sendResponse(res, 400, "Product ID is required");
      }

      const product = await prisma.product.findUnique({
        where: { id },
        select: {
          ...this.getProductSelectFields(),
          inventoryLogs: {
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              quantity: true,
              previousStock: true,
              newStock: true,
              reason: true,
              createdAt: true,
              performedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          saleItems: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              createdAt: true,
              sale: {
                select: {
                  id: true,
                  saleNumber: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        return sendResponse(res, 404, "Product not found");
      }

      return sendResponse(res, 200, "Product retrieved successfully", product);
    } catch (error) {
      console.error("Get product by ID error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async updateProduct(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        costPrice,
        sku,
        barcode,
        minStock,
        maxStock,
        categoryId,
        status,
        imageUrl,
        weight,
        dimensions,
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }
      if (!id) {
        return sendResponse(res, 400, "Product ID is required");
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return sendResponse(res, 404, "Product not found");
      }

      // Check unique constraints if updating SKU or barcode
      if (sku && sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findUnique({ where: { sku } });
        if (existingSku) {
          return sendResponse(res, 409, "Product with this SKU already exists");
        }
      }

      if (barcode && barcode !== existingProduct.barcode) {
        const existingBarcode = await prisma.product.findUnique({
          where: { barcode },
        });
        if (existingBarcode) {
          return sendResponse(
            res,
            409,
            "Product with this barcode already exists"
          );
        }
      }

      // Check category if updating
      if (categoryId && categoryId !== existingProduct.categoryId) {
        const category = await prisma.category.findFirst({
          where: { id: categoryId, isActive: true },
        });
        if (!category) {
          return sendResponse(res, 404, "Category not found or inactive");
        }
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description && { description: description.trim() }),
          ...(price && { price }),
          ...(costPrice && { costPrice }),
          ...(sku && { sku: sku.trim() }),
          ...(barcode && { barcode: barcode.trim() }),
          ...(minStock && { minStock }),
          ...(maxStock && { maxStock }),
          ...(categoryId && { categoryId }),
          ...(status && { status }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(weight !== undefined && { weight }),
          ...(dimensions !== undefined && { dimensions }),
          updatedAt: new Date(),
        },
        select: this.getProductSelectFields(),
      });

      return sendResponse(
        res,
        200,
        "Product updated successfully",
        updatedProduct
      );
    } catch (error) {
      console.error("Update product error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Product not found");
        }
        if (error.code === "P2002") {
          const field = error.meta?.target as string;
          return sendResponse(
            res,
            409,
            `Product with this ${field} already exists`
          );
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async updateStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { quantity, type, reason = "Stock adjustment" } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }
      if (!id) {
        return sendResponse(res, 400, "Product ID is required");
      }

      if (!quantity || typeof quantity !== "number") {
        return sendResponse(res, 400, "Valid quantity is required");
      }

      if (quantity <= 0) {
        return sendResponse(res, 400, "Quantity must be greater than 0");
      }

      const validTypes: InventoryLogType[] = [
        "STOCK_IN",
        "STOCK_OUT",
        "ADJUSTMENT",
      ];
      if (!validTypes.includes(type)) {
        return sendResponse(res, 400, "Invalid inventory log type");
      }

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Get current product with lock
        const product = await tx.product.findUnique({
          where: { id },
          select: { id: true, quantity: true, name: true },
        });

        if (!product) {
          throw new Error("Product not found");
        }

        const previousStock = product.quantity;
        let newStock = previousStock;

        // Calculate new stock based on type
        switch (type) {
          case "STOCK_IN":
            newStock = previousStock + quantity;
            break;
          case "STOCK_OUT":
            if (previousStock < quantity) {
              throw new Error("Insufficient stock");
            }
            newStock = previousStock - quantity;
            break;
          case "ADJUSTMENT":
            newStock = quantity;
            break;
        }

        if (newStock < 0) {
          throw new Error("Stock cannot be negative");
        }

        // Update product stock
        const updatedProduct = await tx.product.update({
          where: { id },
          data: { quantity: newStock },
          select: this.getProductSelectFields(),
        });

        // Create inventory log
        await tx.inventoryLog.create({
          data: {
            type,
            quantity,
            previousStock,
            newStock,
            reason,
            productId: id,
            performedById: userId,
          },
        });

        return updatedProduct;
      });

      return sendResponse(res, 200, "Stock updated successfully", result);
    } catch (error) {
      console.error("Update stock error:", error);

      if (error instanceof Error) {
        if (error.message === "Product not found") {
          return sendResponse(res, 404, "Product not found");
        }
        if (error.message === "Insufficient stock") {
          return sendResponse(res, 400, "Insufficient stock");
        }
        if (error.message === "Stock cannot be negative") {
          return sendResponse(res, 400, "Stock cannot be negative");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async deleteProduct(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(res, 400, "Authentication required");
      }
      if (!id) {
        return sendResponse(res, 400, "Product ID is required");
      }

      // Check if product exists and has active sales
      //   const productWithSales = await prisma.product.findUnique({
      //     where: { id },
      //     include: {
      //       saleItems: {
      //         take: 1,
      //         include: {
      //           sale: {
      //             where: { status: { in: ["PENDING", "COMPLETED"] } },
      //           },
      //         },
      //       },
      //     },
      //   });

      //   if (!productWithSales) {
      //     return sendResponse(res, 404, "Product not found");
      //   }

      //   if (productWithSales.saleItems.length > 0) {
      //     return sendResponse(
      //       res,
      //       400,
      //       "Cannot delete product with associated sales"
      //     );
      //   }

      // Get product first
      const productWithSales = await prisma.product.findUnique({
        where: { id },
      });

      if (!productWithSales) {
        return sendResponse(res, 404, "Product not found");
      }

      // Check if product has any active sales (PENDING or COMPLETED)
      const activeSale = await prisma.saleItem.findFirst({
        where: {
          productId: id,
          sale: {
            status: { in: ["PENDING", "COMPLETED"] },
          },
        },
      });

      if (activeSale) {
        return sendResponse(
          res,
          400,
          "Cannot delete product with associated sales"
        );
      }

      // Soft delete
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return sendResponse(res, 200, "Product deleted successfully");
    } catch (error) {
      console.error("Delete product error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return sendResponse(res, 404, "Product not found");
        }
      }

      return sendResponse(res, 500, "Internal server error");
    }
  }

  async searchProducts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        q: searchQuery,
        page = 1,
        limit = 20,
        inStock = "true",
      } = req.query;

      if (!searchQuery?.toString().trim()) {
        return sendResponse(res, 400, "Search query is required");
      }

      const searchTerm = searchQuery.toString().trim();
      if (searchTerm.length < 2) {
        return sendResponse(
          res,
          400,
          "Search term must be at least 2 characters long"
        );
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.ProductWhereInput = {
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
          { sku: { contains: searchTerm, mode: "insensitive" } },
        ],
      };

      if (inStock === "true") {
        where.quantity = { gt: 0 };
      }

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limitNum,
          //   orderBy: [
          //     {
          //       _relevance: {
          //         fields: ["name"],
          //         search: searchTerm,
          //         sort: "desc",
          //       },
          //     },
          //     { createdAt: "desc" },
          //   ],

          orderBy: { createdAt: "desc" },
          select: this.getProductSelectFields(true), // Minimal fields for search
        }),
        prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        products,
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

      return sendResponse(
        res,
        200,
        "Search completed successfully",
        responseData
      );
    } catch (error) {
      console.error("Search products error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }

  async getLowStockProducts(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // -------------------------------
      // RAW QUERY (Because column-to-column comparison is needed)
      // -------------------------------

      const products = await prisma.$queryRawUnsafe<any[]>(`
      SELECT *
      FROM "Product"
      WHERE "isActive" = true
      AND "quantity" <= "minStock"
      ORDER BY "quantity" ASC
      OFFSET ${skip}
      LIMIT ${limitNum}
    `);

      const totalCountResult = await prisma.$queryRawUnsafe<
        { count: number }[]
      >(`
      SELECT COUNT(*)::int AS count
      FROM "Product"
      WHERE "isActive" = true
      AND "quantity" <= "minStock"
    `);
      const totalCount = totalCountResult[0]?.count || 0;

      const outOfStockResult = await prisma.$queryRawUnsafe<
        { count: number }[]
      >(`
      SELECT COUNT(*)::int AS count
      FROM "Product"
      WHERE "isActive" = true
      AND "quantity" = 0
    `);
      const outOfStock = outOfStockResult[0]?.count || 0;

      const totalPages = Math.ceil(totalCount / limitNum);

      const responseData = {
        products,
        summary: {
          totalLowStock: totalCount,
          outOfStock,
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum,
        },
      };

      return sendResponse(
        res,
        200,
        "Low stock products retrieved successfully",
        responseData
      );
    } catch (error) {
      console.error("Get low stock products error:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  }
}

export default new ProductController();
