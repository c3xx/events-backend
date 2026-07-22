import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getVenueTypeRoles);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createVenueTypeRole);

export default router;
