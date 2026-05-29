import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getVenueFacilities);
router.put("/", requirePermissions(["venue:modify_facilities"]), controller.setVenueFacilities);

export default router;
