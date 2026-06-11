import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", controller.getEventOrganizers);

router.post("/", controller.addEventOrganizer);

router.delete("/:organizerId", controller.removeEventOrganizer);

export default router;
