import { Router } from "express";
import permissionsRouter from "./permission/routes.js";

const router: Router = Router();

router.use("/:id/permissions", permissionsRouter);

export default router;
