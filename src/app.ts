import { styleText } from "node:util";
import cookieParser from "cookie-parser";
import express, { type Application, Router } from "express";
import { nanoid } from "nanoid";
import { env } from "@/lib/env.js";
import { authenticateToken, cors, errorHandler } from "@/middlewares/index.js";

// end of normal imports, and router imports follow:

import authRouter from "@/modules/auth/routes.js";
import eventRouter from "@/modules/event/routes.js";
import eventCategoriesRouter from "@/modules/event-category/routes.js";
import eventTypesRouter from "@/modules/event-type/routes.js";
import facilitiesRouter from "@/modules/facility/routes.js";
import meRouter from "@/modules/me/routes.js";
import organizationRouter from "@/modules/organization/routes.js";
import organizationTypesRouter from "@/modules/organization-type/routes.js";
import permissionsRouter from "@/modules/permission/routes.js";
import rolesRouter from "@/modules/role/routes.js";
import usersRouter from "@/modules/user/routes.js";
import venuesRouter from "@/modules/venue/routes.js";
import venueTypesRouter from "@/modules/venue-type/routes.js";
import workflowTemplatesRouter from "@/modules/workflow-template/routes.js";

const app: Application = express();

// todo: rate-limits

if (!env.QUIET) {
	app.use((req, res, next) => {
		const id = nanoid(10); // note: store in req.id
		const path = req.path;
		const timeStart = Date.now();

		console.info(
			styleText("magenta", new Date().toISOString()),
			styleText("dim", id),
			styleText(["bgCyan", "black"], ` ${req.method} `),
			path,
		);

		function onFinish() {
			const resOk = res.statusCode >= 200 && res.statusCode < 300;
			console.info(
				styleText("magenta", new Date().toISOString()),
				styleText("dim", id),
				styleText([resOk ? "bgGreen" : "bgRed"], ` ${res.statusCode} `),
				// path,
				styleText("yellow", `${Date.now() - timeStart}ms`),
			);
		}

		res.once("finish", onFinish);

		next();
	});
}
app.use(
	cors({
		allowedOrigins: [env.FRONTEND_ORIGIN],
		allowCredentials: true,
		allowedHeaders: ["Accept", "Content-Type", "Authorization"],
		allowedMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
		maxAge: 24 * 60 * 60,
	}),
);
app.use(cookieParser());
app.use(express.json());

const apiRouter = Router();

// === Health
apiRouter.get("/", (_req, res) => res.status(200).json({ status: "active" }));

// === Routes
apiRouter.use("/auth", authRouter);

apiRouter.use(authenticateToken);

apiRouter.use("/me", meRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/permissions", permissionsRouter);
apiRouter.use("/roles", rolesRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/organization-types", organizationTypesRouter);
apiRouter.use("/venues", venuesRouter);
apiRouter.use("/venue-types", venueTypesRouter);
apiRouter.use("/facilities", facilitiesRouter);
apiRouter.use("/event-types", eventTypesRouter);
apiRouter.use("/event-categories", eventCategoriesRouter);
apiRouter.use("/events", eventRouter);
apiRouter.use("/workflow-templates", workflowTemplatesRouter);

app.use("/", apiRouter);

// app.use(express.static(resolve("public")));
// app.get("/{*path}", (_req, res) => {
// 	res.sendFile(resolve("public", "index.html"));
// });

app.use(errorHandler);

export default app;
