import { Router } from "express";
import * as controller from "./controller.js";
import { rateLimiter } from "@/middlewares/index.js";

const router: Router = Router({ mergeParams: true });

router.post(
	"/",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event_venue_allotment:write" }),
	controller.createVenueAllotment,
);
router.delete(
	"/:allotmentId",
	rateLimiter({ maxRequests: 60, windowMs: 15 * 60 * 1000, prefix: "event_venue_allotment:write" }),
	controller.deleteVenueAllotment,
);

export default router;
