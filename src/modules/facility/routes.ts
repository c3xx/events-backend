import { Router } from "express";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";
import { default as membersRouter, default as providersRouter } from "./provider/routes.js";
import { facilityIdParamHandler } from "./scopes.js";

const router: Router = Router();

router.get("/", controller.getFacilities);
router.get("/event-associated", controller.getEventAssociatedFacilities);

router.post("/", requireUserType("admin"), controller.createFacility);

router.param("facilityId", facilityIdParamHandler);

router.get("/:facilityId", controller.getFacility);

// todo: add route for changing facility availability
// todo: add route in venues for getting venue facilities separately

router.use("/:facilityId/providers", providersRouter);
router.use("/:facilityId/members", membersRouter);

export default router;
