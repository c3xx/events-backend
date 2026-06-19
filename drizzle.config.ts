import { lstatSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

try {
	const envFilepath = "./.env";
	lstatSync(envFilepath);
	loadEnvFile(envFilepath);
} catch {}


const DATABASE_URL = process.env.DATABASE_URL;
if (typeof DATABASE_URL !== "string" || DATABASE_URL.trim().length === 0) {
	throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: DATABASE_URL,
	},
	casing: "snake_case",
});
