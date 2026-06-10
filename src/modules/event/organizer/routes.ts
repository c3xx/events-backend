import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getEventOrganizers);
router.post("/", requirePermissions(["event_organizer:add"]), controller.addEventOrganizer);

router.delete(
	"/:organizerId",
	requirePermissions(["event_organizer:remove"]),
	controller.removeEventOrganizer,
);

export default router;
