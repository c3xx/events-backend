import { Router } from "express";
import { authenticateToken } from "@/middlewares/index.js";
import * as authController from "./controller.js";

const router: Router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.post("/reset-password", authController.resetPassword);
router.post("/generate-password-token", authController.generatePasswordToken);

router.use(authenticateToken);
router.get("/me", authController.userDetails);

export default router;
