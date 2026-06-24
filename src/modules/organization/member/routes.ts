import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getOrganizationMembers);
router.post("/", requireUserType("admin"), controller.addMemberToOrganization);
router.put("/:userId", requireUserType("admin"), controller.updateOrganizationMemberRoles);
router.delete("/:userId", requireUserType("admin"), controller.deleteOrganizationMember);

export default router;
