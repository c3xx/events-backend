import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import facilitiesRouter from "./facility/routes.js";
import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getVenues);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createVenue);

router.get("/:id", rateLimiter(), controller.getVenue);

router.use("/:id/members", membersRouter);

router.use("/:id/facilities", facilitiesRouter);

export default router;
