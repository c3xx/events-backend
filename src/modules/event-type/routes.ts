import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getEventTypes);
router.post("/", requirePermissions(["event_type:create"]), controller.createEventType);

router.get("/:id", controller.getEventType);
router.delete("/:id", requirePermissions(["event_type:delete"]), controller.deleteEventType);

router.use("/:id/children", childrenRouter);

export default router;
