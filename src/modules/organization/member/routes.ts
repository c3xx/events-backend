import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getOrganizationMembers);
router.post("/", rateLimiter(), requireUserType("admin"), controller.addMemberToOrganization);
router.put(
	"/:userId",
	rateLimiter(),
	requireUserType("admin"),
	controller.updateOrganizationMemberRoles,
);
router.delete(
	"/:userId",
	rateLimiter(),
	requireUserType("admin"),
	controller.deleteOrganizationMember,
);

export default router;
