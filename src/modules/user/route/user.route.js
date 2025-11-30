"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validate_1 = require("../../../middleware/validate");
const user_validation_1 = require("../utils/user.validation");
const user_controller_1 = __importDefault(require("../controller/user.controller"));
const auth_middleware_1 = __importDefault(require("../../../middleware/auth.middleware"));
const router = express_1.default.Router();
router
    .route("/register")
    .post((0, validate_1.validate)(user_validation_1.registerUserSchema), user_controller_1.default.registerUser);
router
    .route("/login")
    .post((0, validate_1.validate)(user_validation_1.loginUserSchema), user_controller_1.default.loginUser);
router
    .route("/")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.getAllUser);
router
    .route("/:id")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.getUserById)
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isSuperAdmin, user_controller_1.default.assignUserRole);
router
    .route("/deactivate/:id")
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.deactivateUser);
router
    .route("/activate/:id")
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.activateUser);
router
    .route("/demote/:id")
    .patch(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isSuperAdmin, user_controller_1.default.demoteToCustomer);
router
    .route("/profile/:userId")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.getProfile);
router
    .route("/role/:role ")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.getUserByRole);
router
    .route("/profile")
    .patch(auth_middleware_1.default.isAuthenticated, (0, validate_1.validate)(user_validation_1.updateProfileSchema), user_controller_1.default.updateProfile);
router
    .route("/search")
    .get(auth_middleware_1.default.isAuthenticated, auth_middleware_1.default.isAdmin, user_controller_1.default.searchUsers);
router
    .route("/logout")
    .post(auth_middleware_1.default.isAuthenticated, user_controller_1.default.logout);
exports.default = router;
//# sourceMappingURL=user.route.js.map