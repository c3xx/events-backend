import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

router.post(
	"/request-password-token",
	requireUserType("end_user"),
	controller.requestPasswordToken,
);
router.post("/reset-password", requireUserType("end_user"), controller.resetPassword);

export default router;
