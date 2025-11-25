import express from "express";
import { validate } from "../../../middleware/validate";
import { loginUserSchema, registerUserSchema } from "../utils/user.validation";
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
  );

export default router;
