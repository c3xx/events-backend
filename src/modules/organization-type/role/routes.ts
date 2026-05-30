import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getOrganizationTypeRoles);
router.post(
	"/",
	requirePermissions(["organization_type:create_role"]),
	controller.createOrganizationTypeRole,
);

export default router;
