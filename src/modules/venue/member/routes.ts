import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getVenueMembers);
router.post("/", rateLimiter(), requireUserType("admin"), controller.addMemberToVenue);
router.put("/:userId", rateLimiter(), requireUserType("admin"), controller.updateVenueMemberRoles);
router.delete("/:userId", rateLimiter(), requireUserType("admin"), controller.deleteVenueMember);

export default router;
