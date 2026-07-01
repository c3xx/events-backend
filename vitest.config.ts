import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@/": fileURLToPath(new URL("./src/", import.meta.url)),
		},
	},
	test: {
		globalSetup: "./test/global-setup.ts",
		setupFiles: ["./test/setup-env.ts", "./test/setup.ts"],
		testTimeout: 60 * 1000,
		hookTimeout: 60 * 1000,
		fileParallelism: false,
		env: {
			JWT_ACCESS_SECRET: "teststuff",
			JWT_REFRESH_SECRET: "teststuffagain",
			ADMIN_LOGIN_EMAIL: "testsystem@tkmce.ac.in",
			ADMIN_LOGIN_PASSWORD: "teststuffpass",
			RESEND_API_TOKEN: "mock-token",
			EMAIL_FROM: "TKMCE Events <notifications@events.tkmce.ac.in>",
			ARGON2_TIME_COST: "1",
			NODE_ENV: "test",
			FRONTEND_ORIGIN: "https://events.tkmce.ac.in",
			PORT: "3912",
			QUIET: "1",
		},
	},
});
