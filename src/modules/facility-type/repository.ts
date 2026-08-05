import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getFacilityTypes = dbAction(async () => {
	return await db
		.select({
			id: schema.facilityType.id,
			name: schema.facilityType.name,
		})
		.from(schema.facilityType)
		.where(isNull(schema.facilityType.deletedAt))
		.orderBy(schema.facilityType.createdAt);
});

export const insertFacilityType = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.facilityType)
		.values({
			name: data.name,
		})
		.returning({ id: schema.facilityType.id });

	if (inserted == null) unreachable();

	return inserted;
});

export const findFacilityTypeById = dbAction(async (facilityTypeId: number) => {
	const [facilityType] = await db
		.select({
			id: schema.facilityType.id,
			name: schema.facilityType.name,
		})
		.from(schema.facilityType)
		.where(and(eq(schema.facilityType.id, facilityTypeId), isNull(schema.facilityType.deletedAt)));

	return facilityType;
});
