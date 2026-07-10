import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "organization:read" }),
	controller.getOrganizations,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "organization:write" }),
	requireUserType("admin"),
	controller.createOrganization,
);

router.get(
	"/:id",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "organization:read" }),
	controller.getOrganization,
);

router.use("/:id/members", membersRouter);

export default router;
