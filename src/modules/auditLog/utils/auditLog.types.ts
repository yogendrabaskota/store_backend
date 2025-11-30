export interface AuditLogData {
  action: string;
  description: string;
  resource?: string;
  resourceId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}
export interface AuditLogFilters {
  action?: string;
  resource?: string;
  resourceId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
