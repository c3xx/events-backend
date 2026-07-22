import { Router } from "express";
import { rateLimiter } from "@/middlewares/index.js";
import { requireUserType } from "@/middlewares/require-user-type.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getFacilities);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createFacility);

export default router;
