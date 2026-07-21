import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getFacilities);
router.post("/", requireUserType("admin"), controller.createFacility);

router.patch("/:id", requireUserType("admin"), controller.updateFacility);
router.delete("/:id", requireUserType("admin"), controller.deleteFacility);

export default router;
