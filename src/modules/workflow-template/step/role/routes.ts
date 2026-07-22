import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getAllWorkflowTemplateStepRoles);
router.post(
	"/",
	rateLimiter(),
	requireUserType("admin"),
	controller.assignRoleToWorkflowTemplateStep,
);
router.delete(
	"/:roleId",
	rateLimiter(),
	requireUserType("admin"),
	controller.unassignRoleFromWorkflowTemplateStep,
);

export default router;
