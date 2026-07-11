import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import approvalAssignmentsRouter from "./approval-assignments/routes.js";
import * as controller from "./controller.js";
import invitationRouter from "./invitation/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me:read" }),
	controller.userDetails,
);
router.patch(
	"/",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "me:write" }),
	controller.updateProfile,
);

router.get(
	"/organizations/event-creatable",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "me:read" }),
	controller.getEventCreatableOrganizations,
);

router.use("/approval-assignments", approvalAssignmentsRouter);

router.use("/invitations", invitationRouter);

export default router;
