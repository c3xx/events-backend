import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_type_children:read" }),
	controller.getEventTypeChildTypes,
);
router.post(
	"/:childId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "event_type_children:write" }),
	requireUserType("admin"),
	controller.addAllowedChildType,
);
router.delete(
	"/:childId",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "event_type_children:write" }),
	requireUserType("admin"),
	controller.removeAllowedChildType,
);

export default router;
