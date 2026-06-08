import { Router } from "express";
import * as controller from "./controller.js";
import { templateIdParamHandler } from "./scopes.js";
import stepRouter from "./step/routes.js";

const router: Router = Router();

router.get("/", controller.getAllWorkflowTemplates);
router.post("/", controller.createWorkflowTemplate);

router.param("templateId", templateIdParamHandler);

router.get("/:templateId", controller.getWorkflowTemplate);

router.use("/:templateId/steps", stepRouter);

export default router;
