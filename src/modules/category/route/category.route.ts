import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import categoryController from "../controller/category.controller";

const router = express.Router();

router
  .route("/categories")
  .post(
    authMiddleware.isAuthenticated,
    authMiddleware.isSuperAdmin,
    categoryController.createCategory
  )
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    categoryController.getCategories
  );
router
  .route("/categories/minimal")
  .get(authMiddleware.isAuthenticated, categoryController.getCategoriesMinimal);

router
  .route("/categories/:id")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    categoryController.getCategoryById
  )
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    categoryController.updateCategory
  )
  .delete(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    categoryController.deleteCategory // soft delete or deactivate
  );

export default router;
