import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getVenueFacilities);
router.put("/", requireUserType("admin"), controller.setVenueFacilities);

export default router;
