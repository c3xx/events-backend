import { styleText } from "node:util";
import cookieParser from "cookie-parser";
import express, { type Application } from "express";
import { nanoid } from "nanoid";
import { env } from "@/lib/env.js";
import { authenticateToken, cors, errorHandler } from "@/middlewares/index.js";

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
		const id = nanoid(10);
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

// === Health
app.get("/", (_req, res) => res.status(200).json({ status: "active" }));

// === Routes
app.use("/auth", authRouter);

app.use(authenticateToken);

app.use("/me", meRouter);
app.use("/users", usersRouter);
app.use("/permissions", permissionsRouter);
app.use("/roles", rolesRouter);
app.use("/organizations", organizationRouter);
app.use("/organization-types", organizationTypesRouter);
app.use("/venues", venuesRouter);
app.use("/venue-types", venueTypesRouter);
app.use("/facilities", facilitiesRouter);
app.use("/event-types", eventTypesRouter);
app.use("/event-categories", eventCategoriesRouter);
app.use("/events", eventRouter);
app.use("/workflow-templates", workflowTemplatesRouter);

app.use(errorHandler);

export default app;
