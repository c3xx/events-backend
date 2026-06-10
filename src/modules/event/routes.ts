import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

import venueAllotmentRouter from "./venue-allotment/routes.js";

const router: Router = Router();

router.post("/", controller.createEvent);
router.get("/", controller.getEvents);
router.patch("/:id", requirePermissions(["event:manage"]), controller.updateEvent);

router.get("/:id", controller.getEvent);

router.use("/:id/venue-allotments", venueAllotmentRouter);

export default router;
