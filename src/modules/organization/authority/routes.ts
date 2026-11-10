import { Router } from "express";
import { authorityIdParamHandler } from "../scopes.js";
import * as controller from "./controller.js";

import permissionsRouter from "./permission/routes.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getAllAuthorityHolders);
router.post("/", controller.createAuthorityHolder);

router.param("authorityId", authorityIdParamHandler);

router.get("/:authorityId", controller.getAuthorityHolder);
router.delete("/:authorityId", controller.removeAuthorityHolder);

router.use("/:authorityId/permissions", permissionsRouter);

export default router;
