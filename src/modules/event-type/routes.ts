import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { rateLimiter } from "@/middlewares/index.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_type:read" }),
	controller.getEventTypes,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "event_type:write" }),
	requireUserType("admin"),
	controller.createEventType,
);

router.get(
	"/:id",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_type:read" }),
	controller.getEventType,
);
router.delete(
	"/:id",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "event_type:write" }),
	requireUserType("admin"),
	controller.deleteEventType,
);

router.use("/:id/children", childrenRouter);

export default router;
