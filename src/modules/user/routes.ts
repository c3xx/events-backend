import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "user:read" }),
	controller.getUsers,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "user:write" }),
	requireUserType("admin"),
	controller.createUser,
);

export default router;
