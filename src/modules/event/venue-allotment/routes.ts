import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

// todo: separate venue allotments from /event/:id to a separate route here

router.post("/", controller.createVenueAllotment);
router.delete("/:allotmentId", controller.deleteVenueAllotment);

export default router;
