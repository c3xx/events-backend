import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getPendingApprovalEvents);
router.get("/events/:eventId/assignments", controller.getEventAssignments);
router.post("/", controller.respondToAssignments);

export default router;
