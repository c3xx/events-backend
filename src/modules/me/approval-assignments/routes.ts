import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/events", rateLimiter(), controller.getPendingApprovalEvents);
router.get("/events/:eventId", rateLimiter(), controller.getEventAssignments);
router.patch("/events/:eventId", rateLimiter(), controller.respondToAssignments);

export default router;
