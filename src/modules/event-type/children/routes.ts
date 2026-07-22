import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getEventTypeChildTypes);
router.post("/:childId", rateLimiter(), requireUserType("admin"), controller.addAllowedChildType);
router.delete(
	"/:childId",
	rateLimiter(),
	requireUserType("admin"),
	controller.removeAllowedChildType,
);

export default router;
