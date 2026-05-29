import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getEventCategories);
router.post("/", requirePermissions(["event_category:create"]), controller.createEventType);

export default router;
