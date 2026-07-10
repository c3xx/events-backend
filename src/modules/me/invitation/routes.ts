import { Router } from "express";
import * as controller from "./controller.js";
import { rateLimiter } from "@/middlewares/index.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me_invitation:read" }),
	controller.getPendingInvitations,
);
router.get(
	"/:invitationId",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me_invitation:read" }),
	controller.getPendingInvitation,
);
router.patch(
	"/:invitationId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "me_invitation:write" }),
	controller.respondToInvitation,
);

export default router;
