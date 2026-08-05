import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/", controller.addFacilityProvider);
router.delete("/:providerId", controller.removeFacilityProvider);

export default router;
