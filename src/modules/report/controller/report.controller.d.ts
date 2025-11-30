import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class ReportController {
    /**
     * Generate sales report
     */
    generateSalesReport(req: AuthRequest, res: Response): Promise<Response>;
    private getSalesReportData;
    private getProductSalesData;
    private getPaymentMethodData;
    /**
     * Generate inventory report
     */
    generateInventoryReport(req: AuthRequest, res: Response): Promise<Response>;
    private getStockLevels;
    private getLowStockItems;
    private getStockMovements;
    private getInventoryValue;
}
declare const _default: ReportController;
export default _default;
//# sourceMappingURL=report.controller.d.ts.map