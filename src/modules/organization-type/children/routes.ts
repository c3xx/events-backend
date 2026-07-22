import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getOrganizationTypeChildTypes);
router.post("/:childId", rateLimiter(), requireUserType("admin"), controller.addAllowedChildType);

export default router;
