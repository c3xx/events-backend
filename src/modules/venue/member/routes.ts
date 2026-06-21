import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getVenueMembers);
router.post("/", requireUserType("admin"), controller.addMemberToVenue);
router.put("/:userId", requireUserType("admin"), controller.updateVenueMemberRoles);
router.delete("/:userId", requireUserType("admin"), controller.deleteVenueMember);

export default router;
