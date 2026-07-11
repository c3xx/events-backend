import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

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
