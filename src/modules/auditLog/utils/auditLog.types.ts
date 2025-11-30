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
