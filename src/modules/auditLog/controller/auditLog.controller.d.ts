import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class AuditLogController {
    getAuditLogs(req: AuthRequest, res: Response): Promise<Response>;
    private getAuditSummary;
    getAuditLogById(req: AuthRequest, res: Response): Promise<Response>;
    getUserActivity(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: AuditLogController;
export default _default;
//# sourceMappingURL=auditLog.controller.d.ts.map