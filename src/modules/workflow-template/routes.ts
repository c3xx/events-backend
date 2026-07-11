import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";
import { templateIdParamHandler } from "./scopes.js";
import stepRouter from "./step/routes.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "workflow_template:read" }),
	controller.getAllWorkflowTemplates,
);
router.post(
	"/",
	rateLimiter({ maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "workflow_template:write" }),
	requireUserType("admin"),
	controller.createWorkflowTemplate,
);

router.param("templateId", templateIdParamHandler);

router.get(
	"/:templateId",
	rateLimiter({ maxRequests: 200, windowMs: 15 * 60 * 1000, prefix: "workflow_template:read" }),
	controller.getWorkflowTemplate,
);

router.use("/:templateId/steps", stepRouter);

export default router;
