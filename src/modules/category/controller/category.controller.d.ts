import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
declare class CategoryController {
    createCategory(req: AuthRequest, res: Response): Promise<Response>;
    getCategories(req: AuthRequest, res: Response): Promise<Response>;
    getCategoryById(req: AuthRequest, res: Response): Promise<Response>;
    updateCategory(req: AuthRequest, res: Response): Promise<Response>;
    deleteCategory(req: AuthRequest, res: Response): Promise<Response>;
    getCategoriesMinimal(req: AuthRequest, res: Response): Promise<Response>;
    activateCategory(req: AuthRequest, res: Response): Promise<Response>;
    searchCategories(req: AuthRequest, res: Response): Promise<Response>;
    /**
     * Generate search suggestions when no results found
     */
    private generateSearchSuggestions;
}
declare const _default: CategoryController;
export default _default;
//# sourceMappingURL=category.controller.d.ts.map