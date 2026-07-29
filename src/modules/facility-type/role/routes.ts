import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getFacilityTypeRoles);
router.post("/", requireUserType("admin"), controller.createFacilityTypeRole);

export default router;
