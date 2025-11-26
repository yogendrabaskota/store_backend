import express from "express";
import { validate } from "../../../middleware/validate";
import {
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../utils/user.validation";
import userController from "../controller/user.controller";
import authMiddleware from "../../../middleware/auth.middleware";

const router = express.Router();

router
  .route("/register")
  .post(
    authMiddleware.isAuthenticated,
    validate(registerUserSchema),
    userController.registerUser
  );

router
  .route("/login")
  .post(
    authMiddleware.isAuthenticated,
    validate(loginUserSchema),
    userController.loginUser
  );

router
  .route("/")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.getAllUser
  );

router
  .route("/:id")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.getUserById
  )
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isSuperAdmin,
    userController.assignUserRole
  );

router
  .route("/deactivate/:id")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.deactivateUser
  );
router
  .route("/activate/:id")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.activateUser
  );
router
  .route("/demote/:id")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isSuperAdmin,
    userController.demoteToCustomer
  );
router
  .route("/profile/:userId")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.getProfile
  );

router
  .route("/role/:role ")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.getUserByRole
  );

router
  .route("/profile")
  .patch(
    authMiddleware.isAuthenticated,
    validate(updateProfileSchema),
    userController.updateProfile
  );

router
  .route("/search")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    userController.searchUsers
  );

router
  .route("/logout")
  .post(authMiddleware.isAuthenticated, userController.logout);

export default router;
