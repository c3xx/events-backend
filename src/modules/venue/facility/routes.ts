import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue_facility:read" }),
	controller.getVenueFacilities,
);
router.put(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_facility:write" }),
	requireUserType("admin"),
	controller.setVenueFacilities,
);

export default router;
