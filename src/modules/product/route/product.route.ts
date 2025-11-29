import express from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import productController from "../controller/product.controller";

const router = express.Router();

router
  .route("/products")
  .post(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    productController.createProduct
  )
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    productController.getProducts
  );
router
  .route("/products/:id")
  .get(authMiddleware.isAuthenticated, productController.getProductById)
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    productController.updateProduct
  )
  .delete(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    productController.deleteProduct // soft delete or deactivate
  );
router
  .route("/products/:id/stock")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isAdmin,
    productController.updateStock
  );

export default router;
