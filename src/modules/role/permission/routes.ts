import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getRolePermissions);
router.put("/", rateLimiter(), requireUserType("admin"), controller.setRolePermissions);

export default router;
