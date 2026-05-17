import { quickEnv } from "@/lib/helpers.js";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const DATABASE_URL = quickEnv("DATABASE_URL");

const db = drizzle(DATABASE_URL, {
	// logger: true,
	schema: schema,
	casing: "snake_case",
});

export { db, schema };
