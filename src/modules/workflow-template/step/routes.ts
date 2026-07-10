import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { rateLimiter } from "@/middlewares/index.js";
import { stepIdParamHandler } from "@/modules/workflow-template/scopes.js";
import * as controller from "./controller.js";
import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "workflow_template_step:read" }),
	controller.getAllWorkflowTemplateSteps,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "workflow_template_step:write" }),
	requireUserType("admin"),
	controller.createWorkflowTemplateStep,
);

router.param("stepId", stepIdParamHandler);

router.get(
	"/:stepId",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "workflow_template_step:read" }),
	controller.getWorkflowTemplateStep,
);

router.use("/:stepId/roles", roleRouter);

export default router;
