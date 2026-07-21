import { Router } from "express";
import { requireUserType } from "@/middlewares/index.js";
import * as controller from "./controller.js";

const router: Router = Router();

router.get("/", controller.getUsers);
router.post("/", requireUserType("admin"), controller.createUser);

router.patch("/:userId", requireUserType("admin"), controller.updateUser);
router.delete("/:userId", requireUserType("admin"), controller.deleteUser);

export default router;
