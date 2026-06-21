import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getEventTypeChildTypes);
router.post("/:childId", requireUserType("admin"), controller.addAllowedChildType);
router.delete("/:childId", requireUserType("admin"), controller.removeAllowedChildType);

export default router;
