import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import facilitiesRouter from "./facility/routes.js";
import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", controller.getVenues);
router.post("/", requirePermissions(["venue:create"]), controller.createVenue);

router.get("/:id", controller.getVenue);

router.use("/:id/members", membersRouter);

router.use("/:id/facilities", facilitiesRouter);

export default router;
