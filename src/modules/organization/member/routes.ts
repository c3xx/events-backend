import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "organization_member:read" }),
	controller.getOrganizationMembers,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "organization_member:write" }),
	requireUserType("admin"),
	controller.addMemberToOrganization,
);
router.put(
	"/:userId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "organization_member:write" }),
	requireUserType("admin"),
	controller.updateOrganizationMemberRoles,
);
router.delete(
	"/:userId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "organization_member:write" }),
	requireUserType("admin"),
	controller.deleteOrganizationMember,
);

export default router;
