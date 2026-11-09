import { Router } from "express";
import { authorityHolderOrganizationIdParamHandler } from "../scopes.js";
import * as controller from "./controller.js";

import permissionsRouter from "./permission/routes.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getAllAuthorityHolders);
router.post("/", controller.createAuthorityHolder);

router.param("authorityHolderId", authorityHolderOrganizationIdParamHandler);

router.get("/:authorityHolderId", controller.getAuthorityHolder);
router.delete("/:authorityHolderId", controller.removeAuthorityHolder);

router.use("/:authorityHolderId/permissions", permissionsRouter);

export default router;
