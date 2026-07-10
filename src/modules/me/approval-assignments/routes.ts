import { Router } from "express";
import * as controller from "./controller.js";
import { rateLimiter } from "@/middlewares/index.js";

const router: Router = Router();

router.get(
	"/events",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me_approval:read" }),
	controller.getPendingApprovalEvents,
);
router.get(
	"/events/:eventId",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me_approval:read" }),
	controller.getEventAssignments,
);
router.patch(
	"/events/:eventId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "me_approval:write" }),
	controller.respondToAssignments,
);

export default router;
