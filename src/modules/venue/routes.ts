import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import facilitiesRouter from "./facility/routes.js";
import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue:read" }),
	controller.getVenues,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "venue:write" }),
	requireUserType("admin"),
	controller.createVenue,
);

router.get(
	"/:id",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "venue:read" }),
	controller.getVenue,
);

router.use("/:id/members", membersRouter);

router.use("/:id/facilities", facilitiesRouter);

export default router;
