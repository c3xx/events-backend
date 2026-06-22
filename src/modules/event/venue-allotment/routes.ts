import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.post("/", controller.createVenueAllotment);
router.delete("/:allotmentId", controller.deleteVenueAllotment);

export default router;
