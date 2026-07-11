import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";
import organizerRouter from "./organizer/routes.js";
import organizerInvitationRouter from "./organizer-invitation/routes.js";
import { eventIdParamHandler } from "./scopes.js";
import venueAllotmentRouter from "./venue-allotment/routes.js";
import workflowInstanceRouter from "./workflow-instance/routes.js";

const router: Router = Router();

router.get(
	"/parentable",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event:read" }),
	controller.getParentableEvents,
);

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event:read" }),
	controller.getEvents,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event:write" }),
	controller.createEvent,
);

router.param("eventId", eventIdParamHandler);

router.get(
	"/:eventId",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event:read" }),
	controller.getEvent,
);
router.patch(
	"/:eventId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event:write" }),
	controller.updateEvent,
);
router.post(
	"/:eventId/submit",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event:write" }),
	controller.submitEvent,
);

router.delete(
	"/:eventId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event:write" }),
	controller.discardEvent,
);
router.post(
	"/:eventId/cancel",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event:write" }),
	controller.cancelEvent,
);

// todo: adjust the following router to utilize the eventId scope handler
router.use("/:eventId/venue-allotments", venueAllotmentRouter);
router.use("/:eventId/organizers", organizerRouter);
router.use("/:eventId/organizer-invitations", organizerInvitationRouter);
router.use("/:eventId/workflows", workflowInstanceRouter);

export default router;
