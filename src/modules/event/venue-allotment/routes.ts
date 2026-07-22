import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.post("/", rateLimiter(), controller.createVenueAllotment);
router.delete("/:allotmentId", rateLimiter(), controller.deleteVenueAllotment);

export default router;
