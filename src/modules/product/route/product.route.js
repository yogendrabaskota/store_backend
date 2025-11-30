"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const product_controller_1 = __importDefault(require("../controller/product.controller"));
const router = express_1.default.Router();
router
    .route("/products")
    .post(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, product_controller_1.default.createProduct)
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, product_controller_1.default.getProducts);
router
    .route("/products/:id")
    .get(auth_middleware_1.default.isAuthenticated, product_controller_1.default.getProductById)
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, product_controller_1.default.updateProduct)
    .delete(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, product_controller_1.default.deleteProduct // soft delete or deactivate
);
router
    .route("/products/:id/stock")
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, product_controller_1.default.updateStock);
router.route("products/search").get(auth_middleware_1.default.isAuthenticated, product_controller_1.default.searchProducts);
router.route("/products/low-stock").get(auth_middleware_1.default.isAuthenticated, product_controller_1.default.getLowStockProducts);
exports.default = router;
//# sourceMappingURL=product.route.js.map