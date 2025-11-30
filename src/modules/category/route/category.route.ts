import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import categoryController from "../controller/categoty.controller";

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

router
  .route("/categories/:id/activate")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    categoryController.activateCategory
  );
router
  .route("/categories/search")
  .get(authMiddleware.isAuthenticated, categoryController.searchCategories);

export default router;
