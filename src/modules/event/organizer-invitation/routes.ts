import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getEventInvitations);

router.delete("/:invitationId", controller.revokeInvitation);

export default router;
