import * as util from "node:util";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db/index.js";
import type { TxClient } from "./schema.js";

export function section(title: string) {
	console.log(util.styleText(["bold", "cyan"], `\n=== ${title} ===`));
}

export function info(message: string) {
	console.log(util.styleText("dim", `  ${message}`));
}

export function warn(message: string) {
	console.log(util.styleText("yellow", `  ${message}`));
}

export function ok(message: string) {
	console.log(util.styleText("green", `  ${message}`));
}

export async function getOrCreateManagedEntity(
	tx: TxClient,
	managedEntityType: ManagedEntityType,
	refId: number,
): Promise<number> {
	const [existing] = await tx
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, managedEntityType),
				eq(schema.managedEntity.refId, refId),
			),
		)
		.limit(1);

	if (existing != null) return existing.id;

	const [inserted] = await tx
		.insert(schema.managedEntity)
		.values({ managedEntityType, refId })
		.onConflictDoNothing()
		.returning({ id: schema.managedEntity.id });

	if (inserted != null) return inserted.id;

	const [recheck] = await tx
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, managedEntityType),
				eq(schema.managedEntity.refId, refId),
			),
		)
		.limit(1);

	if (recheck == null) {
		throw new Error(
			`Failed to resolve or create managed_entity for ${managedEntityType} #${refId}`,
		);
	}
	return recheck.id;
}
