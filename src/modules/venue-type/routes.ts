import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", controller.getVenueTypes);
router.post("/", requireUserType("admin"), controller.createVenueType);

router.get("/:id", controller.getVenueType);

router.use("/:id/roles", roleRouter);

export default router;
