import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getVenues);
router.post("/", requirePermissions(["venue:create"]), controller.createVenue);

router.get("/:id", controller.getVenue);

router.get("/:id/members", controller.getVenueMembers);
router.post("/:id/members", requirePermissions(["venue:add_member"]), controller.addMemberToVenue);
router.put(
	"/:id/members/:userId",
	requirePermissions(["venue:add_member"]),
	controller.updateVenueMemberRoles,
);
router.delete(
	"/:id/members/:userId",
	requirePermissions(["venue:add_member"]),
	controller.deleteVenueMember,
);

router.get("/:id/facilities", controller.getVenueFacilities);
router.put(
	"/:id/facilities",
	requirePermissions(["venue:modify_facilities"]),
	controller.setVenueFacilities,
);

// todo: [un]assign single facility to venue

export default router;
