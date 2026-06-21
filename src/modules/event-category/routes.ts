import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getEventCategories);
router.post("/", requireUserType("admin"), controller.createEventType);

export default router;
