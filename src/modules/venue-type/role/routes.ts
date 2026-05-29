import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getVenueTypeRoles);
router.post("/", requirePermissions(["venue_type:create_role"]), controller.createVenueTypeRole);

export default router;
