import { InventoryLogType } from "../../../generated/prisma";

interface InventoryFilters {
  productId?: string;
  type?: InventoryLogType;
  startDate?: string;
  endDate?: string;
  performedById?: string;
  saleId?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
