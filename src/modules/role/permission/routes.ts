import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getRolePermissions);
router.put("/", requireUserType("admin"), controller.setRolePermissions);

export default router;
