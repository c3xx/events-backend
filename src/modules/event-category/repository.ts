import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insert = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.eventCategory)
		.values({
			name: data.name,
			isActive: true,
		})
		.returning({ id: schema.eventCategory.id });
	if (inserted == null) unreachable();
	return inserted;
});

export const findMany = dbAction(async () => {
	return await db
		.select({
			id: schema.eventCategory.id,
			name: schema.eventCategory.name,
		})
		.from(schema.eventCategory)
		.where(and(eq(schema.eventCategory.isActive, true), isNull(schema.eventCategory.deletedAt)))
		.orderBy(asc(schema.eventCategory.name));
});

export const updateEventCategory = dbAction(
	async (
		id: number,
		data: {
			name?: string | undefined;
			isActive?: boolean | undefined;
		},
	) => {
		const [updated] = await db
			.update(schema.eventCategory)
			.set(data)
			.where(and(eq(schema.eventCategory.id, id), isNull(schema.eventCategory.deletedAt)))
			.returning({ id: schema.eventCategory.id });
		return updated;
	},
);

export const deleteEventCategory = dbAction(async (id: number) => {
	const result = await db
		.update(schema.eventCategory)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.eventCategory.id, id), isNull(schema.eventCategory.deletedAt)));
	return result;
});
