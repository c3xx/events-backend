import { Router } from "express";
import * as authController from "./controller.js";

const router: Router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
