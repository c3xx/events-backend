import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";
import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "organization_type:read" }),
	controller.getOrganizationTypes,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "organization_type:write" }),
	requireUserType("admin"),
	controller.createOrganizationType,
);

router.get(
	"/:id",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "organization_type:read" }),
	controller.getOrganizationType,
);

router.use("/:id/children", childrenRouter);

router.use("/:id/roles", roleRouter);

export default router;
