import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getRolePermissions);
router.put("/", requirePermissions(["role:modify_permissions"]), controller.setRolePermissions);

export default router;
