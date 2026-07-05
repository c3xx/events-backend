import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import facilitiesRouter from "./facility/routes.js";
import membersRouter from "./member/routes.js";

const router: Router = Router();

router.get("/", controller.getVenues);
router.post("/", requireUserType("admin"), controller.createVenue);

router.get("/:id", controller.getVenue);
router.patch("/:id", requireUserType("admin"), controller.updateVenue);
router.delete("/:id", requireUserType("admin"), controller.deleteVenue);

router.use("/:id/members", membersRouter);

router.use("/:id/facilities", facilitiesRouter);

export default router;
