import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getOrganizationTypeRoles);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createOrganizationTypeRole);

export default router;
