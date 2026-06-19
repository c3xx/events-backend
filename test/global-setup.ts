import fs from "node:fs/promises";
import path from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
	export interface ProvidedContext {
		testDatabaseUrl: string;
	}
}

let container: Awaited<ReturnType<typeof startContainer>>;

async function startContainer() {
	return new PostgreSqlContainer("postgres:17-alpine")
		.withTmpFs({ "/var/lib/postgresql/data": "rw" })
		.start();
}

export default async function setup(project: TestProject) {
	container = await startContainer();
	console.log("Created PostgreSQL container");

	const connectionString = container.getConnectionUri();
	project.provide("testDatabaseUrl", connectionString);

	console.log("Setting up the database...");
	const pool = new Pool({ connectionString });
	const db = drizzle(pool, {
		// logger: true,
		casing: "snake_case",
	});

	console.log("Migrating...");
	await migrate(db, { migrationsFolder: "./drizzle" });

	console.log("Setting up triggers...");
	const triggerCommands = await collectTriggerCommands();
	for (const command of triggerCommands) {
		await db.execute(sql.raw(command));
	}

	await pool.end();
	console.log("Database have been setup successfully");

	return async () => {
		await container.stop();
	};
}

async function collectTriggerCommands() {
	const TRIGGERS_PATH = path.resolve(path.join("src", "db", "triggers"));
	const COMMAND_DELIMITER = "---split---";
	const SQL_COMMENT_PREFIX = "--";
	const NEWLINE = "\n";
	const triggerFiles = await fs
		.readdir(TRIGGERS_PATH, {
			withFileTypes: true,
		})
		.then((entries) =>
			entries
				.filter((entry) => entry.isFile())
				.filter((entry) => path.extname(entry.name) === ".sql")
				.toSorted((a, b) => a.name.localeCompare(b.name)),
		);
	let cmds: string[] = [];
	for (const triggerFile of triggerFiles) {
		const filepath = path.join(TRIGGERS_PATH, triggerFile.name);
		const content = await fs.readFile(filepath, "utf-8");
		const commands = content
			.split(COMMAND_DELIMITER)
			.map((command) => {
				return command
					.split(NEWLINE)
					.map((line) => line.trim())
					.filter((l) => l.length > 0 && !l.startsWith(SQL_COMMENT_PREFIX));
			})
			.filter((commandLines) => commandLines.length > 0)
			.map((commandLines) => commandLines.join(NEWLINE).trim());
		cmds = cmds.concat(commands);
	}
	return cmds;
}
