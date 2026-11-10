import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getAuthorityHolderPermissions);
router.put("/", controller.assignPermissionToAuthorityHolder);
router.delete("/", controller.revokePermissionFromAuthorityHolder);

export default router;
