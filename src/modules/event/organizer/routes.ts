import { Router } from "express";
import * as controller from "./controller.js";
import { rateLimiter } from "@/middlewares/index.js";

const router: Router = Router({ mergeParams: true });

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "event_organizer:read" }),
	controller.getEventOrganizers,
);

router.post(
	"/",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event_organizer:write" }),
	controller.addEventOrganizer,
);

router.delete(
	"/:organizerId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event_organizer:write" }),
	controller.removeEventOrganizer,
);

export default router;
