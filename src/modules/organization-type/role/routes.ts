import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getOrganizationTypeRoles);
router.post("/", requireUserType("admin"), controller.createOrganizationTypeRole);

export default router;
