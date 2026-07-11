import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get(
	"/",
	rateLimiter({
		maxRequests: 200,
		windowMs: 15 * 60 * 1000,
		prefix: "workflow_template_step_role:read",
	}),
	controller.getAllWorkflowTemplateStepRoles,
);
router.post(
	"/",
	rateLimiter({
		maxRequests: 30,
		windowMs: 15 * 60 * 1000,
		prefix: "workflow_template_step_role:write",
	}),
	requireUserType("admin"),
	controller.assignRoleToWorkflowTemplateStep,
);
router.delete(
	"/:roleId",
	rateLimiter({
		maxRequests: 30,
		windowMs: 15 * 60 * 1000,
		prefix: "workflow_template_step_role:write",
	}),
	requireUserType("admin"),
	controller.unassignRoleFromWorkflowTemplateStep,
);

export default router;
