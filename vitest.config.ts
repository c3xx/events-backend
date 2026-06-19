import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globalSetup: "./test/global-setup.ts",
		setupFiles: ["./test/setup-env.ts", "./test/setup.ts"],
		testTimeout: 60 * 1000, // 30s to get the container start (hopefully)
		hookTimeout: 60 * 1000,
		alias: {
			"@/": new URL("./src/", import.meta.url).pathname,
		},
		fileParallelism: false,
	},
});
