import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue_type_role:read" }),
	controller.getVenueTypeRoles,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_type_role:write" }),
	requireUserType("admin"),
	controller.createVenueTypeRole,
);

export default router;
