import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const findFacilities = dbAction(async () => {
	return await db
		.select({
			id: schema.facility.id,
			name: schema.facility.name,
		})
		.from(schema.facility)
		.where(isNull(schema.facility.deletedAt));
});

export const insertFacility = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.facility)
		.values({
			name: data.name,
		})
		.returning({ id: schema.facility.id });

	if (inserted == null) unreachable();

	return inserted;
});

export const updateFacility = dbAction(async (id: number, data: { name: string }) => {
	const [updated] = await db
		.update(schema.facility)
		.set({ name: data.name })
		.where(and(eq(schema.facility.id, id), isNull(schema.facility.deletedAt)))
		.returning({ id: schema.facility.id });
	return updated;
});

export const softDeleteFacility = dbAction(async (id: number) => {
	const result = await db
		.update(schema.facility)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.facility.id, id), isNull(schema.facility.deletedAt)));
	return result;
});
