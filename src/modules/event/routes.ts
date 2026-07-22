import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";
import organizerRouter from "./organizer/routes.js";
import organizerInvitationRouter from "./organizer-invitation/routes.js";
import { eventIdParamHandler } from "./scopes.js";
import venueAllotmentRouter from "./venue-allotment/routes.js";
import workflowInstanceRouter from "./workflow-instance/routes.js";

const router: Router = Router();

router.get("/parentable", rateLimiter(), controller.getParentableEvents);

router.get("/", rateLimiter(), controller.getEvents);
router.post("/", rateLimiter(), controller.createEvent);

router.param("eventId", eventIdParamHandler);

router.get("/:eventId", rateLimiter(), controller.getEvent);
router.patch("/:eventId", rateLimiter(), controller.updateEvent);
router.post("/:eventId/submit", rateLimiter(), controller.submitEvent);

router.delete("/:eventId", rateLimiter(), controller.discardEvent);
router.post("/:eventId/cancel", rateLimiter(), controller.cancelEvent);

// todo: adjust the following router to utilize the eventId scope handler
router.use("/:eventId/venue-allotments", venueAllotmentRouter);
router.use("/:eventId/organizers", organizerRouter);
router.use("/:eventId/organizer-invitations", organizerInvitationRouter);
router.use("/:eventId/workflows", workflowInstanceRouter);

export default router;
