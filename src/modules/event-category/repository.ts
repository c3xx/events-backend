import { and, asc, eq, isNull } from "drizzle-orm";
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
