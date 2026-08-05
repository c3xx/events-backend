import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getEventTypes);
router.post("/", requireUserType("admin"), controller.createEventType);

router.get("/:id", controller.getEventType);
router.patch("/:id", requireUserType("admin"), controller.updateEventType);
router.delete("/:id", requireUserType("admin"), controller.deleteEventType);

router.use("/:id/children", childrenRouter);

export default router;
