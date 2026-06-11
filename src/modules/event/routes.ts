import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";
import { eventIdParamHandler } from "./scopes.js";
import venueAllotmentRouter from "./venue-allotment/routes.js";
import workflowInstanceRouter from "./workflow-instance/routes.js";

const router: Router = Router();

router.post("/", controller.createEvent);
router.get("/", controller.getEvents);
router.patch("/:eventId", requirePermissions(["event:manage"]), controller.updateEvent);

router.get("/:eventId", controller.getEvent);

router.use("/:eventId/venue-allotments", venueAllotmentRouter);
router.use("/:eventId/organizers", organizerRouter);
router.use("/:eventId/organizer-invitations", organizerInvitationRouter);

router.param("eventId", eventIdParamHandler);
router.post("/:eventId/submit", controller.createWorkflowInstance);
router.get("/:eventId", workflowInstanceRouter);

export default router;
