import { ProductStatus } from "../../../generated/prisma";

export interface ProductFilters {
  categoryId?: string;
  status?: ProductStatus;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
