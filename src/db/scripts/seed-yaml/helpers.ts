import { and, eq, isNull } from "drizzle-orm";
import { type db, schema } from "@/db/index.js";

type TxClient = typeof db | DbTransaction;

export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`[seed-yaml] ${message}`);
}

export async function getOrCreateManagedEntity(
	tx: TxClient,
	type: "organization" | "venue",
	refId: number,
): Promise<number> {
	const existing = await tx
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, type),
				eq(schema.managedEntity.refId, refId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	if (existing[0]) {
		return existing[0].id;
	}

	const [inserted] = await tx
		.insert(schema.managedEntity)
		.values({
			managedEntityType: type,
			refId,
		})
		.onConflictDoNothing()
		.returning({ id: schema.managedEntity.id });

	if (inserted) {
		return inserted.id;
	}

	const recheck = await tx
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, type),
				eq(schema.managedEntity.refId, refId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	assert(recheck[0], `Failed to resolve managed entity for ${type} with refId ${refId}`);
	return recheck[0].id;
}
