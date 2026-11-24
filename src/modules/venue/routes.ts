import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";
import { venueIdParamHandler } from "./scopes.js";

const router: Router = Router();

import authoritiesRouter from "./authority/routes.js";
import membersRouter from "./member/routes.js";

router.get("/", controller.getVenues);
router.post("/", requireUserType("admin"), controller.createVenue);

router.param("venueId", venueIdParamHandler);

router.get("/:venueId", controller.getVenue);

router.use("/:venueId/members", membersRouter);
router.use("/:venueId/authorities", authoritiesRouter);

export default router;
