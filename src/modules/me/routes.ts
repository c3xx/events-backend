import { Router } from "express";
import approvalAssignmentsRouter from "./approval-assignments/routes.js";
import * as controller from "./controller.js";
import rolesRouter from "./roles/routes.js";

const router: Router = Router();

router.get("/", controller.userDetails);

router.get("/organizations/event-creatable", controller.getEventCreatableOrganizations);

router.use("/approval-assignments", approvalAssignmentsRouter);
router.use("/roles", rolesRouter);

export default router;
