import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";
import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", controller.getOrganizationTypes);
router.post(
	"/",
	requirePermissions(["organization_type:create"]),
	controller.createOrganizationType,
);

router.get("/:id", controller.getOrganizationType);

router.use("/:id/children", childrenRouter);

router.use("/:id/roles", roleRouter);

export default router;
