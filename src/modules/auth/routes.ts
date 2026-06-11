import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

router.post("/request-password-token", controller.requestPasswordToken);
router.post("/reset-password", controller.resetPassword);

export default router;
