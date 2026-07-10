import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue_member:read" }),
	controller.getVenueMembers,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_member:write" }),
	requireUserType("admin"),
	controller.addMemberToVenue,
);
router.put(
	"/:userId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_member:write" }),
	requireUserType("admin"),
	controller.updateVenueMemberRoles,
);
router.delete(
	"/:userId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_member:write" }),
	requireUserType("admin"),
	controller.deleteVenueMember,
);

export default router;
