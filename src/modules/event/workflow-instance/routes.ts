import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/latest", controller.getLatestWorkflowInstance);
router.get("/all", controller.getAllWorkflowInstances);
router.get("/:id", controller.getWorkflowInstance);
export default router;
