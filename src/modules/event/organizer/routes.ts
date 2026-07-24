import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router({ mergeParams: true });

router.get("/", rateLimiter(), controller.getEventOrganizers);

router.post("/", rateLimiter(), controller.addEventOrganizer);

router.delete("/:organizerId", rateLimiter(), controller.removeEventOrganizer);

export default router;
