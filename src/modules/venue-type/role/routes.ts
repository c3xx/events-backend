import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getVenueTypeRoles);
router.post("/", requireUserType("admin"), controller.createVenueTypeRole);

export default router;
