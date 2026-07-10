import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_category:read" }),
	controller.getEventCategories,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "event_category:write" }),
	requireUserType("admin"),
	controller.createEventType,
);

export default router;

