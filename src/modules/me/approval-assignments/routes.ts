import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getPendingAssignments);
router.post("/respond", controller.respondToAssignments);

export default router;
