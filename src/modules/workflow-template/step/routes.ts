import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { stepIdParamHandler } from "@/modules/workflow-template/scopes.js";
import * as controller from "./controller.js";
import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getAllWorkflowTemplateSteps);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createWorkflowTemplateStep);

router.param("stepId", stepIdParamHandler);

router.get("/:stepId", rateLimiter(), controller.getWorkflowTemplateStep);

router.use("/:stepId/roles", roleRouter);

export default router;
