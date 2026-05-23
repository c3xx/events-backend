import { requirePermissions } from "@/middlewares/require-permissions.js";
import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getEventTypes);
router.post("/", requirePermissions(["event_type:create"]), controller.createEventType);

router.get("/:id", controller.getEventType);
router.delete("/:id", requirePermissions(["event_type:delete"]), controller.deleteEventType);

router.get("/:id/children", controller.getEventTypeChildTypes);
router.post(
	"/:id/children/:childId",
	requirePermissions(["event_type:modify_hierarchy"]),
	controller.addAllowedChildType,
);
router.delete(
	"/:id/children/:childId",
	requirePermissions(["event_type:modify_hierarchy"]),
	controller.removeAllowedChildType,
);

export default router;
