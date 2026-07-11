import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "organization_type_role:read",
	}),
	controller.getOrganizationTypeRoles,
);
router.post(
	"/",
	rateLimiter({
		maxRequests: 30,
		windowMs: 15 * 60 * 1000,
		prefix: "organization_type_role:write",
	}),
	requireUserType("admin"),
	controller.createOrganizationTypeRole,
);

export default router;
