import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/latest", rateLimiter(), controller.getLatestWorkflowInstance);
router.get("/", rateLimiter(), controller.getAllWorkflowInstances);

router.get("/:workflowInstanceId", rateLimiter(), controller.getWorkflowInstance);
router.post("/:workflowInstanceId/abort", rateLimiter(), controller.abortWorkflowInstance);

export default router;
