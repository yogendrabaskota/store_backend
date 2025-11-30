import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class SystemController {
    /**
     * Get all system settings
     */
    getSystemSettings(req: AuthRequest, res: Response): Promise<Response>;
    /**
     * Update system settings
     */
    updateSystemSettings(req: AuthRequest, res: Response): Promise<Response>;
    /**
     * Get system health and status
     */
    getSystemStatus(req: AuthRequest, res: Response): Promise<Response>;
    private checkDatabaseStatus;
    private getRecentErrors;
    /**
     * Backup system data (mock implementation)
     */
    backupSystemData(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: SystemController;
export default _default;
//# sourceMappingURL=system.controller.d.ts.map