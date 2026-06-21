import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";
import { templateIdParamHandler } from "./scopes.js";
import stepRouter from "./step/routes.js";

const router: Router = Router();

router.get("/", controller.getAllWorkflowTemplates);
router.post("/", requireUserType("admin"), controller.createWorkflowTemplate);

router.param("templateId", templateIdParamHandler);

router.get("/:templateId", controller.getWorkflowTemplate);

router.use("/:templateId/steps", stepRouter);

export default router;
