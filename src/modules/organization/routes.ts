import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", controller.getOrganizations);
router.post("/", requirePermissions(["organization:create"]), controller.createOrganization);

router.get("/:id", controller.getOrganization);

router.use("/:id/members", membersRouter);

export default router;
