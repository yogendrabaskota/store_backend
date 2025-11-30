"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const category_controller_1 = __importDefault(require("../controller/category.controller"));
const router = express_1.default.Router();
router
    .route("/categories")
    .post(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isSuperAdmin, category_controller_1.default.createCategory)
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, category_controller_1.default.getCategories);
router
    .route("/categories/minimal")
    .get(auth_middleware_1.default.isAuthenticated, category_controller_1.default.getCategoriesMinimal);
router
    .route("/categories/:id")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, category_controller_1.default.getCategoryById)
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, category_controller_1.default.updateCategory)
    .delete(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, category_controller_1.default.deleteCategory // soft delete or deactivate
);
router
    .route("/categories/:id/activate")
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, category_controller_1.default.activateCategory);
router
    .route("/categories/search")
    .get(auth_middleware_1.default.isAuthenticated, category_controller_1.default.searchCategories);
exports.default = router;
//# sourceMappingURL=category.route.js.map