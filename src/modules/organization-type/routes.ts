import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";
import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getOrganizationTypes);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createOrganizationType);

router.get("/:id", rateLimiter(), controller.getOrganizationType);

router.use("/:id/children", childrenRouter);

router.use("/:id/roles", roleRouter);

export default router;
