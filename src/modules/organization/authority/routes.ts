import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import { authorityIdParamHandler } from "../scopes.js";
import * as controller from "./controller.js";
import permissionsRouter from "./permission/routes.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getAllAuthorityHolders);
router.post("/", requireUserType("admin"), controller.createAuthorityHolder);

router.param("authorityId", authorityIdParamHandler);

router.get("/:authorityId", controller.getAuthorityHolder);
router.delete("/:authorityId", requireUserType("admin"), controller.removeAuthorityHolder);

router.use("/:authorityId/permissions", permissionsRouter);

export default router;
