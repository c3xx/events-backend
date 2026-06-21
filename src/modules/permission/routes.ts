import { Router } from "express";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getPermissions);

export default router;
