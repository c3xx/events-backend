import { Router } from "express";
import * as controller from "./controller.js";
import organizerRouter from "./organizer/routes.js";
import organizerInvitationRouter from "./organizer-invitation/routes.js";
import { eventIdParamHandler } from "./scopes.js";
import venueAllotmentRouter from "./venue-allotment/routes.js";
import workflowInstanceRouter from "./workflow-instance/routes.js";

const router: Router = Router();

router.get("/parentable", controller.getParentableEvents);

router.get("/", controller.getEvents);
router.post("/", controller.createEvent);

router.param("eventId", eventIdParamHandler);

router.get("/:eventId", controller.getEvent);
router.patch("/:eventId", controller.updateEvent);
router.post("/:eventId/submit", controller.submitEvent);

router.delete("/:eventId", controller.discardEvent);
router.post("/:eventId/cancel", controller.cancelEvent);

// todo: adjust the following router to utilize the eventId scope handler
router.use("/:eventId/venue-allotments", venueAllotmentRouter);
router.use("/:eventId/organizers", organizerRouter);
router.use("/:eventId/organizer-invitations", organizerInvitationRouter);
router.use("/:eventId/workflows", workflowInstanceRouter);

export default router;
