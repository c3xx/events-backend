import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/latest", controller.getLatestWorkflowInstance);
router.get("/", controller.getAllWorkflowInstances);
router.get("/:id", controller.getWorkflowInstance);
router.post("/:id/abort", controller.abortWorkflowInstance);
export default router;
