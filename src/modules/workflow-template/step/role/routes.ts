import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getAllWorkflowTemplateStepRoles);
router.post("/", requireUserType("admin"), controller.assignRoleToWorkflowTemplateStep);
router.delete(
	"/:roleId",
	requireUserType("admin"),
	controller.unassignRoleFromWorkflowTemplateStep,
);

export default router;
