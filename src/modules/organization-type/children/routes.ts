import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getOrganizationTypeChildTypes);
router.post(
	"/:childId",
	requirePermissions(["organization_type:modify_hierarchy"]),
	controller.addAllowedChildType,
);

export default router;
