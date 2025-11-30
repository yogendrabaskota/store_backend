export interface GetAllAdminsQuery {
    page?: string;
    limit?: string;
    role?: string;
    search?: string;
}
export interface AdminPaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface RoleWhereCOndition {
    role: UserRole;
}
export declare enum UserRole {
    "ADMIN" = "ADMIN",
    "SUPERADMIN" = "SUPERADMIN",
    "CUSTOMER" = "CUSTOMER",
    "STAFF" = "STAFF"
}
export interface GetProfileParams {
    userId: string;
}
export interface ProfilePaginationQuery {
    page?: string;
    limit?: string;
}
export interface ProfilePaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface UserProfileResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null;
    };
    recentActivity?: {
        sales: any[];
        inventoryLogs: any[];
        pagination: ProfilePaginationInfo;
    };
}
export interface GetUsersByRoleParams {
    role: string;
}
export interface UsersByRoleQuery {
    page?: string;
    limit?: string;
    search?: string;
    isActive?: string;
}
export interface UsersByRoleResponse {
    users: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
//# sourceMappingURL=user.types.d.ts.map