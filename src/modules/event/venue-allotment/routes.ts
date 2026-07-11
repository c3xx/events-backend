import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

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
