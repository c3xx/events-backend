import { Router } from "express";
import { rateLimiter, requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", rateLimiter(), controller.getUsers);
router.post("/", rateLimiter(), requireUserType("admin"), controller.createUser);

export default router;
