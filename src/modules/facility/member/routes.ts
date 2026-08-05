import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getFacilityMembers);
router.post("/", requireUserType("admin"), controller.addMemberToFacility);
router.put("/:userId", requireUserType("admin"), controller.updateFacilityMemberRoles);
router.delete("/:userId", requireUserType("admin"), controller.deleteVenueMember);

export default router;
