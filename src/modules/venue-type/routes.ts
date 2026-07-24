import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getVenueTypes);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createVenueType);

router.get("/:id", rateLimiter(), controller.getVenueType);

router.use("/:id/roles", roleRouter);

export default router;
