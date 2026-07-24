import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getEventInvitations);
router.delete("/:invitationId", rateLimiter(), controller.revokeInvitation);

export default router;
