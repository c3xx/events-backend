import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env.js";
import * as schema from "./schema.js";

const db = drizzle(env.DATABASE_URL, {
	// logger: true,
	schema: schema,
	casing: "snake_case",
});

export { db, schema };
