import { Router } from "express";
import approvalAssignmentsRouter from "./approval-assignments/routes.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.userDetails);
router.patch("/", controller.updateProfile);

router.get("/organizations/event-creatable", controller.getEventCreatableOrganizations);

router.use("/approval-assignments", approvalAssignmentsRouter);

export default router;
