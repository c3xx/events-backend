import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.post("/", requirePermissions(["event_category:create"]), controller.createEventType);
router.get("/", controller.getEventCategories);

export default router;
