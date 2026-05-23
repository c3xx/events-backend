import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/", controller.createEvent);
router.get("/", controller.getEvents);
router.patch("/:id", requirePermissions(["event:manage"]), controller.updateEvent);

router.get("/:id", controller.getEvent);

router.post(
	"/:id/venues",
	requirePermissions(["event:allot_venue"]),
	controller.createVenueAllotment,
);
export default router;
