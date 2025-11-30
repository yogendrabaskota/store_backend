import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
export declare class InventoryController {
    stockIn(req: AuthRequest, res: Response): Promise<Response>;
    stockOut(req: AuthRequest, res: Response): Promise<Response>;
    adjustStock(req: AuthRequest, res: Response): Promise<Response>;
    getInventoryLogs(req: AuthRequest, res: Response): Promise<Response>;
    getProductInventoryLogs(req: AuthRequest, res: Response): Promise<Response>;
    getInventoryLogById(req: AuthRequest, res: Response): Promise<Response>;
    createSaleInventoryLog(productId: string, quantity: number, saleId: string, userId: string, type?: "SALE" | "RETURN"): Promise<void>;
    private getInventorySummary;
    getInventoryDashboard(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: InventoryController;
export default _default;
//# sourceMappingURL=inventory.controller.d.ts.map