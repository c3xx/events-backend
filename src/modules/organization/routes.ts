import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", controller.getOrganizations);
router.post("/", requireUserType("admin"), controller.createOrganization);

router.get("/:id", controller.getOrganization);

router.use("/:id/members", membersRouter);

export default router;
