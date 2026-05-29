import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getOrganizationMembers);
router.post(
	"/",
	requirePermissions(["organization:add_member"]),
	controller.addMemberToOrganization,
);
router.put(
	"/:userId",
	requirePermissions(["organization:add_member"]),
	controller.updateOrganizationMemberRoles,
);
router.delete(
	"/:userId",
	requirePermissions(["organization:add_member"]),
	controller.deleteOrganizationMember,
);

export default router;
