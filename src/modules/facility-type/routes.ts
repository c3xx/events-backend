import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

import roleRouter from "./role/routes.js";

const router: Router = Router();

router.get("/", controller.getFacilityTypes);
router.post("/", requireUserType("admin"), controller.createFacilityType);

router.get("/:id", controller.getFacilityType);

router.use("/:id/roles", roleRouter);

export default router;
