import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "permission:read" }),
	controller.getPermissions,
);

export default router;
