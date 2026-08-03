import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import childrenRouter from "./children/routes.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getEventTypes);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createEventType);

router.get("/:id", rateLimiter(), controller.getEventType);
router.delete("/:id", rateLimiter(), requireUserType("admin"), controller.deleteEventType);

router.use("/:id/children", childrenRouter);

export default router;
