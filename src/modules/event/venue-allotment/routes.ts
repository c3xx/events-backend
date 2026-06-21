import { Router } from "express";
import { requirePermissions } from "@/middlewares/require-permissions.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.post("/", requirePermissions(["event:allot_venue"]), controller.createVenueAllotment);
router.delete(
	"/:allotmentId",
	requirePermissions(["event:allot_venue"]),
	controller.deleteVenueAllotment,
);

export default router;
