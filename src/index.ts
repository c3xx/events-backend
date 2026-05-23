import * as os from "node:os";
import { styleText } from "node:util";
import cookieParser from "cookie-parser";
import express from "express";
import { nanoid } from "nanoid";
import { quickEnv } from "@/lib/helpers.js";
import { authenticateToken, cors, errorHandler } from "@/middlewares/index.js";
import { IS_PROD } from "./lib/constants.js";
import { prepare } from "./prepare.js";
// end of normal imports, and router imports follow:

import authRouter from "@/modules/auth/routes.js";
import facilitiesRouter from "@/modules/facility/routes.js";
import organizationRouter from "@/modules/organization/routes.js";
import organizationTypesRouter from "@/modules/organization-type/routes.js";
import permissionsRouter from "@/modules/permission/routes.js";
import rolesRouter from "@/modules/role/routes.js";
import usersRouter from "@/modules/user/routes.js";
import venuesRouter from "@/modules/venue/routes.js";
import venueTypesRouter from "@/modules/venue-type/routes.js";
import eventTypesRouter from "@/modules/event-type/routes.js";
import eventRouter from "@/modules/event/routes.js";

console.info(
	"[i] starting in",
	styleText("magenta", IS_PROD ? "production" : "development"),
	"mode",
);

console.log("[i] running prepare checks...");
await prepare();

const PORT = Number(quickEnv("PORT")) || 3192;
if (Number.isNaN(PORT) || !Number.isInteger(PORT)) {
	throw new Error("Invalid PORT specified");
}
const FRONTEND_ORIGIN = quickEnv("FRONTEND_ORIGIN");

const app = express();

// todo: rate-limits

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
app.use(
	cors({
		allowedOrigins: [FRONTEND_ORIGIN],
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
app.use("/users", usersRouter);
app.use("/permissions", permissionsRouter);
app.use("/roles", rolesRouter);
app.use("/organizations", organizationRouter);
app.use("/organization-types", organizationTypesRouter);
app.use("/venues", venuesRouter);
app.use("/venue-types", venueTypesRouter);
app.use("/facilities", facilitiesRouter);
app.use("/event-types", eventTypesRouter);
app.use("/event", eventRouter);

app.use(errorHandler);

const HAS_HOST = process.argv.includes("--host");
const HOSTNAME = HAS_HOST ? "0.0.0.0" : (quickEnv("HOSTNAME", false) ?? "localhost");

app.listen(PORT, HOSTNAME, () => {
	console.log(styleText("green", "\nserver is now running"));

	const hostnames = new Map<string, boolean>();

	if (HOSTNAME === "localhost") {
		hostnames.set("localhost", true);
	} else if (HOSTNAME === "0.0.0.0") {
		hostnames.set("localhost", true);
		const interfaces = os.networkInterfaces();
		const addresses = Object.values(interfaces)
			.filter((addresses) => addresses != null)
			.flatMap((addresses) => {
				return addresses
					.filter((address) => address.family === "IPv4")
					.map((address) => [address.address, address.internal] as const);
			});
		for (const [hostname, internal] of addresses) {
			hostnames.set(hostname, internal);
		}
	}

	console.log("\nactive addresses", HAS_HOST ? "(exposed to all):" : "(use --host to expose):");
	hostnames.entries().forEach(([hostname, internal]) => {
		console.log(
			`  * ${internal ? "Local" : "Network"}:`,
			styleText("blue", `http://${hostname}:${PORT}`),
		);
	});
	console.log();
});
