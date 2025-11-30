// User Roles
export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

// Product Status
export enum ProductStatus {
  UNSOLD = "UNSOLD",
  SOLD = "SOLD",
  DAMAGED = "DAMAGED",
  RETURNED = "RETURNED",
  RESERVED = "RESERVED",
}

// Sale Status
export enum SaleStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

// Payment Methods
export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  DIGITAL_WALLET = "DIGITAL_WALLET",
  BANK_TRANSFER = "BANK_TRANSFER",
}

// Inventory Log Types
export enum InventoryLogType {
  STOCK_IN = "STOCK_IN",
  STOCK_OUT = "STOCK_OUT",
  SALE = "SALE",
  RETURN = "RETURN",
  DAMAGE = "DAMAGE",
  ADJUSTMENT = "ADJUSTMENT",
}

// Type guards for runtime validation
export const isUserRole = (value: string): value is UserRole => {
  return Object.values(UserRole).includes(value as UserRole);
};

export const isProductStatus = (value: string): value is ProductStatus => {
  return Object.values(ProductStatus).includes(value as ProductStatus);
};

export const isSaleStatus = (value: string): value is SaleStatus => {
  return Object.values(SaleStatus).includes(value as SaleStatus);
};

export const isPaymentMethod = (value: string): value is PaymentMethod => {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
};

export const isInventoryLogType = (
  value: string
): value is InventoryLogType => {
  return Object.values(InventoryLogType).includes(value as InventoryLogType);
};

// Utility types for forms and APIs
export type UserRoleType = keyof typeof UserRole;
export type ProductStatusType = keyof typeof ProductStatus;
export type SaleStatusType = keyof typeof SaleStatus;
export type PaymentMethodType = keyof typeof PaymentMethod;
export type InventoryLogTypeType = keyof typeof InventoryLogType;

// Display labels for enums
export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SUPERADMIN]: "Super Admin",
  [UserRole.ADMIN]: "Admin",
  [UserRole.STAFF]: "Staff",
  [UserRole.CUSTOMER]: "Customer",
};

export const ProductStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.UNSOLD]: "Unsold",
  [ProductStatus.SOLD]: "Sold",
  [ProductStatus.DAMAGED]: "Damaged",
  [ProductStatus.RETURNED]: "Returned",
  [ProductStatus.RESERVED]: "Reserved",
};

export const SaleStatusLabels: Record<SaleStatus, string> = {
  [SaleStatus.PENDING]: "Pending",
  [SaleStatus.COMPLETED]: "Completed",
  [SaleStatus.CANCELLED]: "Cancelled",
  [SaleStatus.REFUNDED]: "Refunded",
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.DIGITAL_WALLET]: "Digital Wallet",
  [PaymentMethod.BANK_TRANSFER]: "Bank Transfer",
};

export const InventoryLogTypeLabels: Record<InventoryLogType, string> = {
  [InventoryLogType.STOCK_IN]: "Stock In",
  [InventoryLogType.STOCK_OUT]: "Stock Out",
  [InventoryLogType.SALE]: "Sale",
  [InventoryLogType.RETURN]: "Return",
  [InventoryLogType.DAMAGE]: "Damage",
  [InventoryLogType.ADJUSTMENT]: "Adjustment",
};

// Helper functions
export const getUserRoleLabel = (role: UserRole): string =>
  UserRoleLabels[role];
export const getProductStatusLabel = (status: ProductStatus): string =>
  ProductStatusLabels[status];
export const getSaleStatusLabel = (status: SaleStatus): string =>
  SaleStatusLabels[status];
export const getPaymentMethodLabel = (method: PaymentMethod): string =>
  PaymentMethodLabels[method];
export const getInventoryLogTypeLabel = (type: InventoryLogType): string =>
  InventoryLogTypeLabels[type];

// Arrays for dropdowns/selects
export const UserRoleOptions = Object.values(UserRole).map((role) => ({
  value: role,
  label: UserRoleLabels[role],
}));

export const ProductStatusOptions = Object.values(ProductStatus).map(
  (status) => ({
    value: status,
    label: ProductStatusLabels[status],
  })
);

export const SaleStatusOptions = Object.values(SaleStatus).map((status) => ({
  value: status,
  label: SaleStatusLabels[status],
}));

export const PaymentMethodOptions = Object.values(PaymentMethod).map(
  (method) => ({
    value: method,
    label: PaymentMethodLabels[method],
  })
);

export const InventoryLogTypeOptions = Object.values(InventoryLogType).map(
  (type) => ({
    value: type,
    label: InventoryLogTypeLabels[type],
  })
);
