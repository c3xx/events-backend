import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getPendingInvitations);
router.get("/:invitationId", rateLimiter(), controller.getPendingInvitation);
router.patch("/:invitationId", rateLimiter(), controller.respondToInvitation);

export default router;
