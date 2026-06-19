import { loadEnvFile } from "node:process";
import { inject } from "vitest";

const testDatabaseUrl = inject("testDatabaseUrl");
if (testDatabaseUrl == null)
	throw new Error("expected test database url to be provided by the global setup");

process.env.DATABASE_URL = testDatabaseUrl;

loadEnvFile("./.env.test");
