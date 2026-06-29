import * as fs from "node:fs";
import * as path from "node:path";
import { confirm } from "@inquirer/prompts";
import YAML from "yaml";
import { db } from "@/db/index.js";
import { seedConfigSchema } from "./seed-yaml/schemas.js";
import {
	syncAllowedParents,
	syncFacilities,
	syncOrganizations,
	syncOrganizationTypes,
	syncPermissions,
	syncRoles,
	syncUsers,
	syncVenues,
	syncVenueTypes,
} from "./seed-yaml/steps.js";

async function main() {
	const args = process.argv.slice(2);
	const yesFlag = args.includes("-y") || args.includes("--yes");
	const fileArgs = args.filter((arg) => arg !== "-y" && arg !== "--yes");

	const yamlFileArg = fileArgs[0] || "seed-config.yaml";
	const yamlPath = path.resolve(yamlFileArg);

	console.log(`Starting YAML seed/sync from: ${yamlPath}`);
	if (yesFlag) {
		console.log("Auto-approving updates (-y / --yes flag is set)\n");
	} else {
		console.log("Interactive mode: you will be prompted before any updates are applied\n");
	}

	if (!fs.existsSync(yamlPath)) {
		throw new Error(`YAML configuration file not found at: ${yamlPath}`);
	}

	const fileContent = fs.readFileSync(yamlPath, "utf-8");
	const parsedYaml = YAML.parse(fileContent);

	console.log("Validating YAML structure...");
	const validationResult = seedConfigSchema.safeParse(parsedYaml);
	if (!validationResult.success) {
		console.error("YAML Validation Errors:");
		console.error(JSON.stringify(validationResult.error.format(), null, 2));
		process.exit(1);
	}

	const config = validationResult.data;

	const confirmAction = async (message: string): Promise<boolean> => {
		if (yesFlag) return true;
		return await confirm({ message, default: true });
	};

	await db.transaction(async (tx) => {
		const orgTypeMap = await syncOrganizationTypes(
			tx,
			config.organization_types ?? [],
			confirmAction,
		);
		await syncAllowedParents(tx, config.organization_types ?? [], orgTypeMap);

		const orgMap = await syncOrganizations(
			tx,
			config.organizations ?? [],
			orgTypeMap,
			confirmAction,
		);

		const venueTypeMap = await syncVenueTypes(tx, config.venue_types ?? [], confirmAction);
		const facilityMap = await syncFacilities(tx, config.facilities ?? [], confirmAction);

		await syncVenues(tx, config.venues ?? [], venueTypeMap, orgMap, facilityMap, confirmAction);

		const permissionMap = await syncPermissions(tx);
		const roleMap = await syncRoles(
			tx,
			config.roles ?? [],
			orgTypeMap,
			venueTypeMap,
			permissionMap,
			confirmAction,
		);

		await syncUsers(tx, config.users ?? [], orgMap, roleMap, confirmAction);
	});

	console.log("\nYAML Seed & Sync complete.");
	process.exit(0);
}

main().catch((err) => {
	console.error("YAML Seed failed:", err);
	process.exit(1);
});
