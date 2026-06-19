import * as os from "node:os";
import { styleText } from "node:util";
import { IS_PROD } from "@/lib/constants.js";
import { env } from "@/lib/env.js";
import app from "./app.js";
import { prepare } from "./prepare.js";

console.info(
	"[i] starting in",
	styleText("magenta", IS_PROD ? "production" : "development"),
	"mode",
);

console.log("[i] running prepare checks...");
await prepare();

const PORT = Number(env.PORT) || 3192;
if (Number.isNaN(PORT) || !Number.isInteger(PORT)) {
	throw new Error("Invalid PORT specified");
}

const HAS_HOST = process.argv.includes("--host");
const HOSTNAME = HAS_HOST ? "0.0.0.0" : (env.HOSTNAME ?? "localhost");

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
