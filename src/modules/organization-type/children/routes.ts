import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "organization_type_children:read",
	}),
	controller.getOrganizationTypeChildTypes,
);
router.post(
	"/:childId",
	rateLimiter({
		maxRequests: 30,
		windowMs: 15 * 60 * 1000,
		prefix: "organization_type_children:write",
	}),
	requireUserType("admin"),
	controller.addAllowedChildType,
);

export default router;
