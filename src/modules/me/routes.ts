import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import approvalAssignmentsRouter from "./approval-assignments/routes.js";
import * as controller from "./controller.js";
import invitationRouter from "./invitation/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.userDetails);
router.patch("/", rateLimiter(), controller.updateProfile);

router.get(
	"/organizations/event-creatable",
	rateLimiter(),
	controller.getEventCreatableOrganizations,
);

router.use("/approval-assignments", approvalAssignmentsRouter);

router.use("/invitations", invitationRouter);

export default router;
