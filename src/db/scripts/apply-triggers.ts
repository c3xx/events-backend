import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as util from "node:util";
import { sql } from "drizzle-orm";
import { db } from "../index.js";

const TRIGGERS_PATH = path.resolve(path.join("src", "db", "triggers"));
const COMMAND_DELIMITER = "---split---";
const SQL_COMMENT_PREFIX = "--";
const NEWLINE = "\n";

console.log("Reading trigger directory", util.styleText("dim", TRIGGERS_PATH));

const triggerFiles = await fs
	.readdir(TRIGGERS_PATH, {
		withFileTypes: true,
	})
	.then((entries) =>
		entries
			.filter((entry) => path.extname(entry.name) === ".sql")
			.toSorted((a, b) => a.name.localeCompare(b.name)),
	);

console.log(`Found ${triggerFiles.length} trigger files`);

let commandsCount = 0;

for (const triggerFile of triggerFiles) {
	if (!triggerFile.isFile) continue;
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

	console.log(
		util.styleText(["magenta", "bold"], triggerFile.name),
		util.styleText("blue", `(${commands.length} commands)`),
	);

	for (const command of commands) {
		let previewText = command.split("\n")?.[0];
		if (previewText == null || previewText.length === 0) {
			previewText = command.replace(/\s/gm, " ").slice(0, 60);
		}
		console.log("  *", util.styleText("dim", previewText));

		commandsCount++;

		await db.execute(sql.raw(command));
	}
}

console.log(
	util.styleText("green", "Done applying triggers"),
	util.styleText("dim", `(${commandsCount} commands)`),
);
