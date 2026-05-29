import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getVenueMembers);
router.post("/", requirePermissions(["venue:add_member"]), controller.addMemberToVenue);
router.put("/:userId", requirePermissions(["venue:add_member"]), controller.updateVenueMemberRoles);
router.delete("/:userId", requirePermissions(["venue:add_member"]), controller.deleteVenueMember);

export default router;
