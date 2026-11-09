import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import membersRouter from "./member/routes.js";
import { organizationIdParamHandler } from "./scopes.js";

const router: Router = Router();

// todo: protect routes using permissions.

router.get("/", controller.getOrganizations);
router.post("/", requireUserType("admin"), controller.createOrganization);

router.param("organizationId", organizationIdParamHandler);

router.get("/:organizationId", controller.getOrganization);

router.use("/:organizationId/members", membersRouter);

export default router;
