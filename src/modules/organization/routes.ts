import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getOrganizations);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createOrganization);

router.get("/:id", rateLimiter(), controller.getOrganization);

router.use("/:id/members", membersRouter);

export default router;
