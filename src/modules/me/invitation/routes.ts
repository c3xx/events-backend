import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getPendingInvitations);
router.get("/:invitationId", controller.getPendingInvitations);
router.patch("/:invitationId", controller.respondToInvitation);

export default router;
