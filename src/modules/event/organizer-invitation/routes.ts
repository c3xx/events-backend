import { Router } from "express";
import * as controller from "./controller.js";
import { rateLimiter } from "@/middlewares/index.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_organizer_invitation:read" }),
	controller.getEventInvitations,
);

router.delete(
	"/:invitationId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event_organizer_invitation:write" }),
	controller.revokeInvitation,
);

export default router;
