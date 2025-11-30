import { Request, Response } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
declare class User {
    registerUser(req: Request, res: Response): Promise<void>;
    loginUser(req: AuthRequest, res: Response): Promise<Response>;
    getAllUser(req: Request, res: Response): Promise<Response>;
    getUserById(req: Request, res: Response): Promise<Response>;
    assignUserRole(req: AuthRequest, res: Response): Promise<Response>;
    deactivateUser(req: AuthRequest, res: Response): Promise<Response>;
    activateUser(req: AuthRequest, res: Response): Promise<Response>;
    getAllAdmins(req: Request, res: Response): Promise<Response>;
    demoteToCustomer(req: AuthRequest, res: Response): Promise<Response>;
    getProfile(req: Request, res: Response): Promise<Response>;
    getUserByRole(req: Request, res: Response): Promise<Response>;
    updateProfile(req: AuthRequest, res: Response): Promise<Response>;
    searchUsers(req: Request, res: Response): Promise<Response>;
    logout(req: AuthRequest, res: Response): Promise<Response>;
}
declare const _default: User;
export default _default;
//# sourceMappingURL=user.controller.d.ts.map