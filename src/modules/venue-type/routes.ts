import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue_type:read" }),
	controller.getVenueTypes,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue_type:write" }),
	requireUserType("admin"),
	controller.createVenueType,
);

router.get(
	"/:id",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue_type:read" }),
	controller.getVenueType,
);

router.use("/:id/roles", roleRouter);

export default router;
