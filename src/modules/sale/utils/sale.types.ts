import { PaymentMethod, SaleStatus } from "../../../generated/prisma";

export interface SaleFilters {
  startDate?: string;
  endDate?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  staffId?: string;
  customerId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
