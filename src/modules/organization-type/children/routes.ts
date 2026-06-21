import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getOrganizationTypeChildTypes);
router.post("/:childId", requireUserType("admin"), controller.addAllowedChildType);

export default router;
