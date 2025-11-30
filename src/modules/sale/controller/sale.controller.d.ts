import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class SaleController {
    private generateSaleNumber;
    createSale(req: AuthRequest, res: Response): Promise<Response>;
    getSales(req: AuthRequest, res: Response): Promise<Response>;
    getSaleById(req: AuthRequest, res: Response): Promise<Response>;
    updateSaleStatus(req: AuthRequest, res: Response): Promise<Response>;
    private isValidStatusTransition;
    private getSalesSummary;
    getSalesDashboard(req: AuthRequest, res: Response): Promise<Response>;
    searchSales(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: SaleController;
export default _default;
//# sourceMappingURL=sale.controller.d.ts.map