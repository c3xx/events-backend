import { Router } from "express";
import { requirePermissions } from "@/middlewares/index.js";
import * as controller from "./controller.js";
 
const router: Router = Router({ mergeParams: true});

router.get("/", controller.getEventInvitations);

router.post(
    "/",
    requirePermissions(["event_organizer_invitation:send"]),
    controller.sendInvitation,
);

router.patch(
    "/:invitationId/respond",
    requirePermissions(["event_organizer_invitation:respond"]),
    controller.respondToInvitation,
);

router.delete(
    "/:invitationId",
    requirePermissions(["event_organizer_invitation:revoke"]),
    controller.revokeInvitation,
);

export default router;