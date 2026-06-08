import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";
import eventOrganizerRouter from "@/modules/event-organizer/routes.js";

import venueAllotmentRouter from "./venue-allotment/routes.js";

const router: Router = Router();

router.post("/", controller.createEvent);
router.get("/", controller.getEvents);
router.patch("/:id", requirePermissions(["event:manage"]), controller.updateEvent);

router.get("/:id", controller.getEvent);

<<<<<<< HEAD
router.use("/:id/venue-allotments", venueAllotmentRouter);
=======
router.post(
	"/:id/venues",
	requirePermissions(["event:allot_venue"]),
	controller.createVenueAllotment,
);
>>>>>>> da19ada (fix)

export default router;
