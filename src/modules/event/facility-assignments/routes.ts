import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/", controller.assignEventFacility);
router.delete("/:eventFacilityId", controller.unassignEventFacility);

export default router;
