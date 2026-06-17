import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/events", controller.getPendingApprovalEvents);
router.get("/events/:eventId", controller.getEventAssignments);
router.patch("/events/:eventId", controller.respondToAssignments);

export default router;
