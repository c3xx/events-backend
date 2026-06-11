import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

import organizerRouter from "./organizer/routes.js";
import organizerInvitationRouter from "./organizer-invitation/routes.js";
import venueAllotmentRouter from "./venue-allotment/routes.js";

const router: Router = Router();

router.post("/", controller.createEvent);
router.get("/", controller.getEvents);
router.patch("/:eventId", requirePermissions(["event:manage"]), controller.updateEvent);

router.get("/:eventId", controller.getEvent);

router.use("/:eventId/venue-allotments", venueAllotmentRouter);
router.use("/:eventId/organizers", organizerRouter);
router.use("/:eventId/organizer-invitations", organizerInvitationRouter);

export default router;
