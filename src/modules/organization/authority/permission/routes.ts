import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getAuthorityHolderPermissions);
router.put("/", requireUserType("admin"), controller.assignPermissionToAuthorityHolder);
router.delete("/", requireUserType("admin"), controller.revokePermissionFromAuthorityHolder);

export default router;
