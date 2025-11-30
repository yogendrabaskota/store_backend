import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class DashboardController {
    /**
     * Get comprehensive business dashboard
     */
    getBusinessDashboard(req: AuthRequest, res: Response): Promise<Response>;
    private getSalesData;
    private getInventoryData;
    private getCustomerData;
    private getRevenueTrends;
    private getTopProducts;
    private getLowStockAlerts;
    private getRecentActivities;
}
declare const _default: DashboardController;
export default _default;
//# sourceMappingURL=dashboard.controller.d.ts.map