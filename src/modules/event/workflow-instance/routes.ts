import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/latest",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "event_workflow_instance:read",
	}),
	controller.getLatestWorkflowInstance,
);
router.get(
	"/",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "event_workflow_instance:read",
	}),
	controller.getAllWorkflowInstances,
);

router.get(
	"/:workflowInstanceId",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "event_workflow_instance:read",
	}),
	controller.getWorkflowInstance,
);
router.post(
	"/:workflowInstanceId/abort",
	rateLimiter({
		maxRequests: 60,
		windowMs: 15 * 60 * 1000,
		prefix: "event_workflow_instance:write",
	}),
	controller.abortWorkflowInstance,
);

export default router;
