import express from "express";
import { validate } from "../../../middleware/validate";
import { registerUserSchema } from "../utils/user.validation";
import userController from "../controller/user.controller";

const router = express.Router();

router.route("/").post(validate(registerUserSchema),userController.registerUser)

export default router;