import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getLayers);
router.post("/", requireUserType("admin"), controller.createLayer);
router.get("/:layerId", controller.getLayer);
router.delete("/:layerId", requireUserType("admin"), controller.deleteLayer);

export default router;
