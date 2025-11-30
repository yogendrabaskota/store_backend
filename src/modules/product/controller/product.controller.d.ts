import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
declare class ProductController {
    createProduct(req: AuthRequest, res: Response): Promise<Response>;
    getProducts(req: AuthRequest, res: Response): Promise<Response>;
    private getProductSelectFields;
    getProductById(req: AuthRequest, res: Response): Promise<Response>;
    updateProduct(req: AuthRequest, res: Response): Promise<Response>;
    updateStock(req: AuthRequest, res: Response): Promise<Response>;
    deleteProduct(req: AuthRequest, res: Response): Promise<Response>;
    searchProducts(req: AuthRequest, res: Response): Promise<Response>;
    getLowStockProducts(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: ProductController;
export default _default;
//# sourceMappingURL=product.controller.d.ts.map