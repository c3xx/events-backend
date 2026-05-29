import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getEventTypeChildTypes);
router.post(
	"/:childId",
	requirePermissions(["event_type:modify_hierarchy"]),
	controller.addAllowedChildType,
);
router.delete(
	"/:childId",
	requirePermissions(["event_type:modify_hierarchy"]),
	controller.removeAllowedChildType,
);

export default router;
