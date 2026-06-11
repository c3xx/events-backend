import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getAllWorkflowTemplateStepRoles);
router.post("/", controller.assignRoleToWorkflowTemplateStep);

router.delete("/:roleId", controller.unassignRoleFromWorkflowTemplateStep);

export default router;
