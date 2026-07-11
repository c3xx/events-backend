import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.post(
	"/login",
	rateLimiter({ maxRequests: 20, windowMs: 15 * 60 * 1000, prefix: "auth:login" }),
	controller.login,
);
router.post(
	"/refresh",
	rateLimiter({ maxRequests: 20, windowMs: 15 * 60 * 1000, prefix: "auth:refresh" }),
	controller.refresh,
);
router.post(
	"/logout",
	rateLimiter({ maxRequests: 20, windowMs: 15 * 60 * 1000, prefix: "auth:logout" }),
	controller.logout,
);

router.post(
	"/request-password-token",
	rateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000, prefix: "auth:request-password-token" }),
	controller.requestPasswordToken,
);
router.post(
	"/validate-password-token",
	rateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000, prefix: "auth:validate-password-token" }),
	controller.validatePasswordToken,
);
router.post(
	"/reset-password",
	rateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000, prefix: "auth:reset-password" }),
	controller.resetPassword,
);

export default router;
