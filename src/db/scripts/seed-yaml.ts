import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as util from "node:util";
import { confirm } from "@inquirer/prompts";
import { parse as parseYaml } from "yaml";
import { db, schema } from "@/db/index.js";
import { INSTITUTION_DOMAIN } from "@/lib/constants.js";
import { planUpdates } from "./seed-yaml/diff.js";
import { info, warn } from "./seed-yaml/helpers.js";
import type { PlannedUpdate, SeedConfig } from "./seed-yaml/schema.js";
import { seedConfigSchema } from "./seed-yaml/schema.js";
import { runSeedingSteps } from "./seed-yaml/steps.js";

// === Types ==================================================================

export interface ExistingData {
	orgTypes: (typeof schema.organizationType.$inferSelect)[];
	orgs: (typeof schema.organization.$inferSelect)[];
	venueTypes: (typeof schema.venueType.$inferSelect)[];
	facilities: (typeof schema.facility.$inferSelect)[];
	venues: (typeof schema.venue.$inferSelect)[];
	roles: (typeof schema.role.$inferSelect)[];
	users: (typeof schema.user.$inferSelect)[];
	permissions: (typeof schema.permission.$inferSelect)[];
}

// === Main =======================================================

async function main() {
	const args = process.argv.slice(2);
	const yesFlag = args.includes("-y") || args.includes("--yes");
	const fileArgs = args.filter((arg) => arg !== "-y" && arg !== "--yes");
	const configPath = path.resolve(fileArgs[0] ?? "seed-config.yaml");

	console.log(util.styleText("dim", `Reading seed config from ${configPath}`));
	if (yesFlag) {
		console.log(util.styleText("yellow", "Auto-approving updates (-y / --yes flag is set)"));
	} else {
		console.log(
			util.styleText(
				"dim",
				"Interactive mode: you will be prompted before any updates are applied",
			),
		);
	}

	if (
		await fs
			.access(configPath)
			.then(() => false)
			.catch(() => true)
	) {
		throw new Error(`YAML configuration file not found at: ${configPath}`);
	}

	const rawContent = await fs.readFile(configPath, "utf-8");
	const parsedYaml = parseYaml(rawContent);
	const config: SeedConfig = seedConfigSchema.parse(parsedYaml);

	// Validate User Email Domains early
	for (const user of config.users) {
		if (!user.email.endsWith(`@${INSTITUTION_DOMAIN}`)) {
			throw new Error(
				`users: "${user.email}" does not belong to the institution domain (@${INSTITUTION_DOMAIN})`,
			);
		}
	}

	const existingOrgTypes = await db.select().from(schema.organizationType);
	const existingOrgs = await db.select().from(schema.organization);
	const existingVenueTypes = await db.select().from(schema.venueType);
	const existingFacilities = await db.select().from(schema.facility);
	const existingVenues = await db.select().from(schema.venue);
	const existingRoles = await db.select().from(schema.role);
	const existingUsers = await db.select().from(schema.user);
	const existingPermissions = await db.select().from(schema.permission);

	const existingData: ExistingData = {
		orgTypes: existingOrgTypes,
		orgs: existingOrgs,
		venueTypes: existingVenueTypes,
		facilities: existingFacilities,
		venues: existingVenues,
		roles: existingRoles,
		users: existingUsers,
		permissions: existingPermissions,
	};

	const diffResult = planUpdates(config, existingData);
	const plannedUpdates = diffResult.plannedUpdates;

	const approvedUpdates: PlannedUpdate[] = [];
	if (plannedUpdates.length > 0) {
		const restoring = plannedUpdates.filter((p) => p.restore).length;
		warn(
			restoring > 0
				? `Found ${plannedUpdates.length} existing record(s) needing attention (${restoring} soft-deleted):`
				: `Found ${plannedUpdates.length} existing record(s) differing from the config:`,
		);

		for (const p of plannedUpdates) {
			console.log(
				`\n  * [${p.section.toUpperCase()}] ${util.styleText("bold", p.label)}${p.restore ? util.styleText("magenta", "  [restore]") : ""}`,
			);
			for (const change of p.changes) {
				console.log(
					`      ${change.field}: ${util.styleText("red", JSON.stringify(change.from))} -> ${util.styleText("green", JSON.stringify(change.to))}`,
				);
			}

			const message = p.restore
				? `Restore soft-deleted ${p.section} '${p.label}'${p.changes.length > 1 ? " and apply updates" : ""}?`
				: `Apply changes to ${p.section} '${p.label}'?`;

			if (yesFlag || (await confirm({ message, default: false }))) {
				approvedUpdates.push(p);
			} else {
				info(`skipped '${p.label}'; existing values will be kept`);
			}
		}
	}

	await db.transaction(async (tx) => {
		await runSeedingSteps(tx, config, approvedUpdates, existingData, diffResult);
	});

	console.log(util.styleText(["bold", "green"], "\nSeeding complete."));
}

main()
	.catch((error) => {
		console.error(
			util.styleText(["bold", "red"], "\nSeeding failed, all changes were rolled back:"),
		);
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => {
		process.exit(process.exitCode ?? 0);
	});
