import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.userDetails);

router.get("/organizations/event-creatable", controller.getEventCreatableOrganizations);

export default router;
