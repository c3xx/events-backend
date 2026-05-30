import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getVenueTypes = dbAction(async () => {
	return await db
		.select({
			id: schema.venueType.id,
			name: schema.venueType.name,
		})
		.from(schema.venueType)
		.where(isNull(schema.venueType.deletedAt))
		.orderBy(schema.venueType.createdAt);
});

export const insertVenueType = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.venueType)
		.values({ name: data.name })
		.returning({ id: schema.venueType.id });

	if (inserted == null) unreachable();

	return inserted;
});

export const getVenueType = dbAction(async (venueTypeId: number) => {
	return await db.query.venueType.findFirst({
		where: and(eq(schema.venueType.id, venueTypeId), isNull(schema.venueType.deletedAt)),
		columns: {
			id: true,
			name: true,
		},
	});
});
